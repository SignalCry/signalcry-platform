const express = require("express");
const cors = require("cors");
const http = require("http");
const healthRouter = require("./src/routes/health");
const coinsRoute = require("./src/routes/coins");
const newsRoute = require("./src/routes/news");
const indicatorsRoute = require("./src/routes/indicators");
const { setupWebSocketServer } = require("./src/routes/websocket");
const { initIndicators } = require("./src/services/indicatorService");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api/coins", coinsRoute);
app.use("/api/news", newsRoute);
app.use("/api/indicators", indicatorsRoute);

// Setup WebSocket server
setupWebSocketServer(server);

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws/market`);
  initIndicators().catch((err) =>
    console.error("[Indicators] Init failed:", err.message)
  );
});
