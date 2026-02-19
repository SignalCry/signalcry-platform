const { Router } = require("express");
const { getNews, getArticle } = require("../services/newsService");

const router = Router();

router.get("/", async (req, res) => {
  try {
    const news = await getNews();
    res.json(news);
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
