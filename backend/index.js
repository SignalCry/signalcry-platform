const express = require("express");
const cors = require("cors");
const healthRouter = require("./src/routes/health");
const coinsRoute = require("./src/routes/coins");
const newsRoute = require("./src/routes/news");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api/coins", coinsRoute);
app.use("/api/news", newsRoute);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
