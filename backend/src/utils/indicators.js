/**
 * Technical indicator calculations.
 * Pure functions, no dependencies. Operates on arrays of closing prices.
 *
 * All formulas use standard definitions:
 * - EMA: Exponential Moving Average with smoothing factor 2/(period+1)
 * - RSI: Wilder's smoothed RS over `period` bars
 * - MACD: EMA(12) - EMA(26), signal = EMA(9) of MACD line
 * - Bollinger Bands: SMA(20) ± 2 * stddev(20)
 */

/**
 * Exponential Moving Average.
 * Returns the last EMA value for the given period, or null if insufficient data.
 * @param {number[]} closes - Array of closing prices (oldest → newest)
 * @param {number} period
 * @returns {number|null}
 */
function ema(closes, period) {
  if (closes.length < period) return null;

  const k = 2 / (period + 1);

  // Seed with SMA of the first `period` values
  let value = 0;
  for (let i = 0; i < period; i++) {
    value += closes[i];
  }
  value /= period;

  // Apply EMA formula for remaining values
  for (let i = period; i < closes.length; i++) {
    value = closes[i] * k + value * (1 - k);
  }

  return value;
}

/**
 * Full EMA series (needed internally for MACD).
 * Returns array of same length as input, with nulls where insufficient data.
 * @param {number[]} closes
 * @param {number} period
 * @returns {(number|null)[]}
 */
function emaSeries(closes, period) {
  const result = new Array(closes.length).fill(null);
  if (closes.length < period) return result;

  const k = 2 / (period + 1);

  let value = 0;
  for (let i = 0; i < period; i++) {
    value += closes[i];
  }
  value /= period;
  result[period - 1] = value;

  for (let i = period; i < closes.length; i++) {
    value = closes[i] * k + value * (1 - k);
    result[i] = value;
  }

  return result;
}

/**
 * RSI (Wilder's smoothing, 14-period default).
 * Returns the last RSI value, or null if insufficient data.
 * @param {number[]} closes
 * @param {number} period
 * @returns {number|null}
 */
function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average over first `period` changes
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for remaining bars
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * MACD (12, 26, 9).
 * Returns { macd, signal, histogram } or null if insufficient data.
 * @param {number[]} closes
 * @returns {{ macd: number, signal: number, histogram: number }|null}
 */
function macd(closes) {
  const fast = 12;
  const slow = 26;
  const signalPeriod = 9;

  if (closes.length < slow + signalPeriod) return null;

  const ema12 = emaSeries(closes, fast);
  const ema26 = emaSeries(closes, slow);

  // MACD line = EMA12 - EMA26  (valid from index slow-1 onwards)
  const macdLine = [];
  for (let i = slow - 1; i < closes.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdLine.push(ema12[i] - ema26[i]);
    }
  }

  if (macdLine.length < signalPeriod) return null;

  // Signal line = EMA(9) of MACD line
  const signalValue = ema(macdLine, signalPeriod);
  if (signalValue === null) return null;

  const macdValue = macdLine[macdLine.length - 1];
  const histogram = macdValue - signalValue;

  return {
    macd: macdValue,
    signal: signalValue,
    histogram,
  };
}

/**
 * Bollinger Bands (20 period, 2 std deviations).
 * Returns { upper, middle, lower } or null if insufficient data.
 * @param {number[]} closes
 * @param {number} period
 * @param {number} stdDevMultiplier
 * @returns {{ upper: number, middle: number, lower: number }|null}
 */
function bollingerBands(closes, period = 20, stdDevMultiplier = 2) {
  if (closes.length < period) return null;

  // SMA of last `period` values
  const slice = closes.slice(-period);
  const middle = slice.reduce((sum, v) => sum + v, 0) / period;

  // Standard deviation
  const variance =
    slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + stdDevMultiplier * stdDev,
    middle,
    lower: middle - stdDevMultiplier * stdDev,
  };
}

module.exports = { ema, rsi, macd, bollingerBands };
