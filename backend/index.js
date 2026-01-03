const express = require("express");
const cors = require("cors");
const healthRouter = require("./src/routes/health");
const coinsRoute = require("./src/routes/coins");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api/coins", coinsRoute);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
