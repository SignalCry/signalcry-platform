const { Router } = require("express");
const { resolvePair } = require("../data/coinMetadata");
const { fetchSpotKlines } = require("../services/binanceKlinesService");

const router = Router();

const ALLOWED_INTERVALS = new Set(["1h", "4h", "1d"]);
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

router.get("/:symbol/klines", async (req, res) => {
  try {
    const pair = resolvePair(req.params.symbol);
    if (!pair) {
      return res.status(404).json({ error: "Unknown symbol" });
    }

    const interval = req.query.interval ?? "1h";
    if (!ALLOWED_INTERVALS.has(interval)) {
      return res.status(400).json({
        error: "Invalid interval",
        allowed: [...ALLOWED_INTERVALS],
      });
    }

    const limitRaw = req.query.limit ?? String(DEFAULT_LIMIT);
    const limit = parseInt(limitRaw, 10);
    if (!Number.isFinite(limit) || limit < 1 || limit > MAX_LIMIT) {
      return res.status(400).json({
        error: "Invalid limit",
        min: 1,
        max: MAX_LIMIT,
      });
    }

    // Request one extra bar; the unclosed candle is dropped in fetchSpotKlines.
    const fetchLimit = Math.min(limit + 1, MAX_LIMIT);
    const candles = await fetchSpotKlines(pair, interval, fetchLimit).then((rows) =>
      rows.slice(0, limit)
    );

    res.json({
      symbol: req.params.symbol.toLowerCase(),
      interval,
      candles,
    });
  } catch (err) {
    console.error("[market route] Error:", err.message);
    res.status(502).json({ error: "Failed to load klines" });
  }
});

module.exports = router;
