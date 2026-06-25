const MAX_KLINE_RETRIES = 5;
const SPOT_KLINES_URL = "https://api.binance.com/api/v3/klines";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(res, attempt) {
  const header = res.headers.get("retry-after");
  if (header) {
    const seconds = parseInt(header, 10);
    if (!Number.isNaN(seconds)) return (seconds + 5) * 1000;
  }
  return (attempt + 1) * 30_000;
}

function parseKlineRow(k) {
  return {
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  };
}

/**
 * Fetch OHLCV candles from Binance Spot REST with retry on rate limits.
 * @param {string} pairSymbol - e.g. "btcusdt"
 * @param {string} interval - e.g. "1h", "4h", "1d"
 * @param {number} limit - max candles (Binance cap: 1000)
 * @param {number} [attempt=0]
 * @returns {Promise<{ time: number, open: number, high: number, low: number, close: number, volume: number }[]>}
 */
async function fetchSpotKlines(pairSymbol, interval, limit, attempt = 0) {
  const url =
    `${SPOT_KLINES_URL}?symbol=${pairSymbol.toUpperCase()}` +
    `&interval=${interval}&limit=${limit}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "SignalCry/1.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 429 || res.status === 418) {
    if (attempt >= MAX_KLINE_RETRIES) {
      throw new Error(`Binance REST ${res.status} for ${pairSymbol}`);
    }
    const retryMs = getRetryAfterMs(res, attempt);
    console.warn(
      `[Binance Klines] ${res.status} for ${pairSymbol}, retrying in ${Math.round(retryMs / 1000)}s (attempt ${attempt + 1}/${MAX_KLINE_RETRIES})...`
    );
    await sleep(retryMs);
    return fetchSpotKlines(pairSymbol, interval, limit, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`Binance REST ${res.status} for ${pairSymbol}`);
  }

  const data = await res.json();
  const now = Date.now();
  const closed = data.filter((k) => k[6] <= now);

  return closed.map(parseKlineRow);
}

module.exports = { fetchSpotKlines };
