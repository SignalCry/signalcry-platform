const { Router } = require("express");
const { getIndicators } = require("../services/indicatorService");

const router = Router();

router.get("/", (req, res) => {
  try {
    const data = getIndicators();
    res.json(data);
  } catch (err) {
    console.error("[indicators route] Error:", err.message);
    res.status(500).json({ error: "Failed to load indicators" });
  }
});

module.exports = router;
