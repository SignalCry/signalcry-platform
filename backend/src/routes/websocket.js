const WebSocket = require("ws");
const binanceService = require("../services/binanceWebSocket");

/**
 * Setup WebSocket server for client connections
 */
function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: "/ws/market"
  });

  console.log("[WebSocket Server] Initialized on path: /ws/market");

  wss.on("connection", (ws, req) => {
    console.log(`[WebSocket Server] New connection from ${req.socket.remoteAddress}`);
    
    // Mark connection as alive
    ws.isAlive = true;

    // Add client to Binance service
    binanceService.addClient(ws);

    // Handle ping for keep-alive
    ws.on("ping", () => {
      ws.isAlive = true;
    });

    // Handle client messages
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (error) {
        console.error("[WebSocket Server] Message parse error:", error.message);
      }
    });

    ws.on("error", (error) => {
      console.error("[WebSocket Server] Client error:", error.message);
    });
  });

  // Keep-alive ping interval (30 seconds)
  const keepAliveInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log("[WebSocket Server] Terminating inactive connection");
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(keepAliveInterval);
    console.log("[WebSocket Server] Closed");
  });

  return wss;
}

module.exports = { setupWebSocketServer };
