require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const healthRouter = require("./src/routes/health");
const newsRoute = require("./src/routes/news");
const indicatorsRoute = require("./src/routes/indicators");
const authRoute = require("./src/routes/auth");
const { setupWebSocketServer } = require("./src/routes/websocket");
const { initIndicators } = require("./src/services/indicatorService");
const { cleanupOldArticles, getNews } = require("./src/services/newsService");
const cron = require("node-cron");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api/auth", authRoute);
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
  cleanupOldArticles().catch((err) =>
    console.error("[newsService] Cleanup failed:", err.message)
  );
});

// Run cleanup daily at 3 AM
cron.schedule("0 3 * * *", () => {
  cleanupOldArticles().catch((err) =>
    console.error("[newsService] Scheduled cleanup failed:", err.message)
  );
});

// Warm RSS cache on boot, then refresh every 10 min
getNews().catch((err) => console.error("[newsService] Initial fetch failed:", err.message));
setInterval(() => {
  getNews().catch((err) => console.error("[newsService] Scheduled fetch failed:", err.message));
}, 10 * 60 * 1000);
