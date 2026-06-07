const WebSocket = require("ws");
const { ema, rsi, macd, bollingerBands } = require("../utils/indicators");
const { fetchSpotKlines } = require("./binanceKlinesService");

/**
 * Indicator Service
 *
 * Architecture decisions:
 * - Fetches 200 x 1h candles per symbol from Binance Spot REST (free, no API key).
 * - Subscribes to live spot kline WebSocket for real-time updates.
 * - Recalculates indicators only on confirmed candle closes (not every tick)
 *   to avoid noise and reduce CPU.
 * - Stores computed results in memory — the REST endpoint reads from here.
 * - 200 candles is sufficient: longest lookback is EMA(200).
 * - Bootstrap requests are sequential with backoff to avoid Binance IP bans (418).
 *
 * Security:
 * - No user input reaches Binance — symbols are hardcoded.
 * - No eval, no dynamic code, no shell commands.
 * - WebSocket messages are validated before processing.
 */

const TRADING_PAIRS = [
  "btcusdt", "ethusdt", "bnbusdt", "solusdt", "xrpusdt",
  "adausdt", "dogeusdt", "trxusdt", "maticusdt", "linkusdt",
  "ltcusdt", "avaxusdt", "dotusdt", "atomusdt",
];

const KLINE_INTERVAL = "1h";
const KLINE_LIMIT = 201; // 201 so we have 200 after dropping the unclosed bar
const BOOTSTRAP_DELAY_MS = 250;

// In-memory stores
const klineData = new Map();   // symbol -> number[] (closing prices)
const indicators = new Map();  // symbol -> computed indicator object

let ws = null;
let reconnectTimeout = null;
let initialized = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchKlines(symbol) {
  const candles = await fetchSpotKlines(symbol, KLINE_INTERVAL, KLINE_LIMIT);
  return candles.map((c) => c.close);
}

/**
 * Compute all indicators for a symbol from its closing prices.
 */
function computeIndicators(symbol, closes) {
  if (!closes || closes.length < 26) return null;

  const currentPrice = closes[closes.length - 1];

  // EMAs
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);

  // RSI
  const rsiValue = rsi(closes, 14);

  // MACD
  const macdResult = macd(closes);

  // Bollinger Bands
  const bbResult = bollingerBands(closes, 20, 2);

  return {
    symbol,
    price: currentPrice,
    ema: {
      ema20: ema20 ? { value: ema20, trend: currentPrice > ema20 ? "bullish" : "bearish" } : null,
      ema50: ema50 ? { value: ema50, trend: currentPrice > ema50 ? "bullish" : "bearish" } : null,
      ema200: ema200 ? { value: ema200, trend: currentPrice > ema200 ? "bullish" : "bearish" } : null,
    },
    rsi: rsiValue !== null
      ? {
          value: rsiValue,
          condition:
            rsiValue > 70 ? "overbought" : rsiValue < 30 ? "oversold" : "neutral",
        }
      : null,
    macd: macdResult
      ? {
          macd: macdResult.macd,
          signal: macdResult.signal,
          histogram: macdResult.histogram,
          momentum: macdResult.macd > macdResult.signal ? "bullish" : "bearish",
        }
      : null,
    bollingerBands: bbResult
      ? {
          upper: bbResult.upper,
          middle: bbResult.middle,
          lower: bbResult.lower,
          status:
            currentPrice >= bbResult.upper
              ? "overextended"
              : currentPrice <= bbResult.lower
                ? "rebound_zone"
                : "within_bands",
        }
      : null,
    updatedAt: Date.now(),
  };
}

/**
 * Bootstrap: fetch historical klines sequentially, compute initial indicators.
 */
async function bootstrap() {
  console.log("[Indicators] Bootstrapping with historical klines (spot API, sequential)...");

  let succeeded = 0;
  const failures = [];

  for (let i = 0; i < TRADING_PAIRS.length; i++) {
    const symbol = TRADING_PAIRS[i];
    try {
      const closes = await fetchKlines(symbol);
      klineData.set(symbol, closes);
      const result = computeIndicators(symbol, closes);
      if (result) indicators.set(symbol, result);
      succeeded++;
    } catch (err) {
      failures.push(err);
      console.warn("[Indicators] Failed:", err.message);
    }

    if (i < TRADING_PAIRS.length - 1) {
      await sleep(BOOTSTRAP_DELAY_MS);
    }
  }

  console.log(`[Indicators] Bootstrap done: ${succeeded}/${TRADING_PAIRS.length} symbols loaded`);
  if (failures.length > 0 && succeeded === 0) {
    console.warn("[Indicators] All bootstrap requests failed — indicators will be empty until retry");
  }
}

/**
 * Subscribe to live 1h spot kline stream for all pairs.
 * We only recalculate on confirmed candle closes (x === true).
 */
function connectKlineStream() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  const streams = TRADING_PAIRS.map((s) => `${s}@kline_${KLINE_INTERVAL}`).join("/");
  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

  console.log("[Indicators] Connecting to Binance kline stream...");
  ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("[Indicators] Kline stream connected");
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (!msg.data?.k) return;

      const k = msg.data.k;
      const symbol = k.s?.toLowerCase();
      if (!symbol || !TRADING_PAIRS.includes(symbol)) return;

      // Only recalculate on confirmed candle close
      if (!k.x) return;

      const closePrice = parseFloat(k.c);
      const closes = klineData.get(symbol);
      if (!closes) return;

      // Append new close, keep last 200
      closes.push(closePrice);
      if (closes.length > 200) closes.shift();

      const result = computeIndicators(symbol, closes);
      if (result) indicators.set(symbol, result);
    } catch (err) {
      console.error("[Indicators] Kline message error:", err.message);
    }
  });

  ws.on("error", (err) => {
    console.error("[Indicators] Kline stream error:", err.message);
  });

  ws.on("close", () => {
    console.log("[Indicators] Kline stream closed, reconnecting in 5s...");
    ws = null;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connectKlineStream, 5000);
  });
}

/**
 * Initialize the indicator service.
 * Called once on server start.
 */
async function initIndicators() {
  if (initialized) return;
  initialized = true;

  await bootstrap();
  connectKlineStream();
}

/**
 * Get all computed indicators.
 * @returns {object[]}
 */
function getIndicators() {
  return Array.from(indicators.values());
}

module.exports = { initIndicators, getIndicators };
