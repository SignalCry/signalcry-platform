const { Router } = require("express");
const { getNewsPaginated, getAvailableDates, getArticle } = require("../services/newsService");

const router = Router();

router.get("/dates", async (req, res) => {
  try {
    const dates = await getAvailableDates();
    res.json({ dates });
  } catch (err) {
    console.error("[news route] Error:", err.message);
    res.status(500).json({ error: "Failed to load dates" });
  }
});

router.get("/", async (req, res) => {
  try {
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const source = typeof req.query.source === "string" ? req.query.source : "";
    const topic  = typeof req.query.topic  === "string" ? req.query.topic  : "";
    const date   = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : "";
    const result = await getNewsPaginated({ cursor, limit, source, topic, date });
    res.json(result);
  } catch (err) {
    console.error("[news route] Error:", err.message);
    res.status(500).json({ error: "Failed to load news" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const article = await getArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    res.json(article);
  } catch (err) {
    console.error("[news route] Error:", err.message);
    res.status(500).json({ error: "Failed to load article" });
  }
});

module.exports = router;
