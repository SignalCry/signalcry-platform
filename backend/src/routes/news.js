const { Router } = require("express");
const { getNews } = require("../services/newsService");

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

module.exports = router;
