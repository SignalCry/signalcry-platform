const { Router } = require("express");
const news = require("../data/news");

const router = Router();

router.get("/", (req, res) => {
  res.json(news);
});

module.exports = router;
