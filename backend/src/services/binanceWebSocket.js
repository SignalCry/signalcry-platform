const WebSocket = require("ws");

/**
 * Binance Spot WebSocket Service
 * Connects to Binance Spot ticker streams and broadcasts to all connected clients
 */
class BinanceWebSocketService {
  constructor() {
    this.binanceWs = null;
    this.clients = new Set();
    this.reconnectTimeout = null;
    this.isConnecting = false;
    this.priceData = new Map();
    this.lastUpdate = new Map();
    this._firstMessageLogged = false; // For debug logging

    // Trading pairs to monitor
    this.tradingPairs = [
      "btcusdt",
      "ethusdt",
      "bnbusdt",
      "solusdt",
      "xrpusdt",
      "adausdt",
      "dogeusdt",
      "trxusdt",
      "maticusdt",
      "linkusdt",
      "ltcusdt",
      "avaxusdt",
      "dotusdt",
      "atomusdt",
    ];

    // Initialize with default data structure
    this.tradingPairs.forEach((symbol) => {
      this.priceData.set(symbol, {
        symbol,
        price: 0,
        priceChange: 0,
        priceChangePercent: 0,
        volume: 0,
        quoteVolume: 0,
        highPrice: 0,
        lowPrice: 0,
        openPrice: 0,
        timestamp: Date.now(),
      });
    });
    this.lastBroadcast = new Map(); // Track last broadcast time per symbol
  }

  /**
   * Build Binance combined stream URL
   */
  getBinanceStreamUrl() {
    const streams = this.tradingPairs
      .map((pair) => `${pair}@ticker`)
      .join("/");
    return `wss://stream.binance.com:9443/stream?streams=${streams}`;
  }

  /**
   * Connect to Binance Spot WebSocket
   */
  connectToBinance() {
    if (this.isConnecting || (this.binanceWs && this.binanceWs.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const url = this.getBinanceStreamUrl();
    console.log("[Binance WS] Connecting to:", url);

    this.binanceWs = new WebSocket(url);

    this.binanceWs.on("open", () => {
      console.log("[Binance WS] Connected successfully");
      this.isConnecting = false;
      this.broadcastStatus("connected");
    });

    this.binanceWs.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        
        // 🔍 DEBUG: Log raw message from Binance (first message only to avoid spam)
        if (!this._firstMessageLogged) {
          console.log("[Binance WS] 📨 SAMPLE MESSAGE STRUCTURE:", JSON.stringify(parsed, null, 2));
          this._firstMessageLogged = true;
        }
        
        if (parsed.stream && parsed.data) {
          this.handleBinanceMessage(parsed.data);
        }
      } catch (error) {
        console.error("[Binance WS] Parse error:", error.message);
      }
    });

    this.binanceWs.on("error", (error) => {
      console.error("[Binance WS] Error:", error.message);
      this.broadcastStatus("error");
    });

    this.binanceWs.on("close", (code, reason) => {
      console.log(`[Binance WS] Closed: ${code} - ${reason || "No reason"}`);
      this.isConnecting = false;
      this.binanceWs = null;
      this.broadcastStatus("disconnected");
      this.scheduleReconnect();
    });
  }

  /**
   * Handle incoming price update from Binance
   */
  handleBinanceMessage(data) {
    try {
      const symbol = data.s?.toLowerCase(); // btcusdt
      if (!symbol || !this.tradingPairs.includes(symbol)) {
        return;
      }

      // 🔍 DEBUG: Log first update for each symbol to see ALL available fields
      if (!this[`_logged_${symbol}`]) {
        console.log(`\n[Binance WS] 📊 RAW DATA FROM BINANCE FOR ${symbol.toUpperCase()}:`);
        console.log(JSON.stringify(data, null, 2));
        console.log(`[Binance WS] 📋 Available fields for ${symbol.toUpperCase()}:`, Object.keys(data));
        this[`_logged_${symbol}`] = true;
      }

      // Extract ticker data
      const price = parseFloat(data.c);           // Current close price
      const priceChange = parseFloat(data.p);      // 24h price change
      const priceChangePercent = parseFloat(data.P); // 24h price change %
      const volume = parseFloat(data.v);           // 24h base volume (e.g., BTC quantity)
      const quoteVolume = parseFloat(data.q);      // 24h quote volume (e.g., USDT value)
      const highPrice = parseFloat(data.h);        // 24h high
      const lowPrice = parseFloat(data.l);         // 24h low
      const openPrice = parseFloat(data.o);        // 24h open
      const timestamp = data.E || Date.now();

      // Update price data with ticker fields
      const priceUpdate = {
        symbol,
        price,
        priceChange,
        priceChangePercent,
        volume,
        quoteVolume,
        highPrice,
        lowPrice,
        openPrice,
        timestamp,
      };

      this.priceData.set(symbol, priceUpdate);
      this.lastUpdate.set(symbol, Date.now());

      // Broadcast to all connected clients (with throttling)
      this.broadcastPriceUpdate(priceUpdate);
    } catch (error) {
      console.error("[Binance WS] Message handling error:", error.message);
    }
  }

  /**
   * Broadcast price update to all connected clients (throttled)
   */
  broadcastPriceUpdate(priceUpdate) {
    const lastBroadcast = this.lastBroadcast.get(priceUpdate.symbol) || 0;
    const now = Date.now();

    // Throttle: Only broadcast if 500ms has passed since last update for this symbol
    if (now - lastBroadcast < 500) {
      return;
    }
    
    this.lastBroadcast.set(priceUpdate.symbol, now);

    const message = JSON.stringify({
      type: "price_update",
      data: priceUpdate,
    });

    this.broadcast(message);
  }

  /**
   * Broadcast connection status
   */
  broadcastStatus(status) {
    const message = JSON.stringify({
      type: "status",
      data: { status },
    });

    this.broadcast(message);
  }

  /**
   * Send message to all connected clients
   */
  broadcast(message) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error("[Binance WS] Broadcast error:", err.message);
        }
      }
    });
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Reconnect after 5 seconds
    this.reconnectTimeout = setTimeout(() => {
      console.log("[Binance WS] Attempting to reconnect...");
      this.connectToBinance();
    }, 5000);
  }

  /**
   * Add a client connection
   */
  addClient(clientWs) {
    this.clients.add(clientWs);
    console.log(`[Binance WS] Client connected. Total clients: ${this.clients.size}`);

    // Send current price data snapshot to new client
    const snapshot = Array.from(this.priceData.values());
    clientWs.send(
      JSON.stringify({
        type: "snapshot",
        data: snapshot,
      })
    );

    // Send current connection status
    const status = this.binanceWs && this.binanceWs.readyState === WebSocket.OPEN 
      ? "connected" 
      : "disconnected";
    
    clientWs.send(
      JSON.stringify({
        type: "status",
        data: { status },
      })
    );

    // Start Binance connection if not already connected
    if (!this.binanceWs || this.binanceWs.readyState !== WebSocket.OPEN) {
      this.connectToBinance();
    }

    // Handle client disconnect
    clientWs.on("close", () => {
      this.clients.delete(clientWs);
      console.log(`[Binance WS] Client disconnected. Total clients: ${this.clients.size}`);

      // Close Binance connection if no clients
      if (this.clients.size === 0 && this.binanceWs) {
        console.log("[Binance WS] No clients. Closing Binance connection.");
        this.binanceWs.close();
        this.binanceWs = null;
      }
    });

    // Handle ping/pong for keep-alive
    clientWs.on("pong", () => {
      clientWs.isAlive = true;
    });
  }

  /**
   * Cleanup and close all connections
   */
  cleanup() {
    console.log("[Binance WS] Cleaning up...");

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.binanceWs) {
      this.binanceWs.close();
      this.binanceWs = null;
    }

    this.clients.forEach((client) => {
      client.close();
    });

    this.clients.clear();
  }
}

// Singleton instance
const binanceService = new BinanceWebSocketService();

module.exports = binanceService;
