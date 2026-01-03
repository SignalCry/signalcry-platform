const { Router } = require("express");

const coins = require("../data/coins");

const router = Router();

router.get("/", (req, res) => {
	res.json(coins);
});

module.exports = router;
