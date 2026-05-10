"use client";

import { useEffect, useRef, useState } from "react";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type PriceUpdate = {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  timestamp: number;
};

export type MarketData = Map<string, PriceUpdate>;

const isDev = process.env.NODE_ENV !== "production";

export function useBinanceWebSocket(url: string) {
  const [marketData, setMarketData] = useState<MarketData>(new Map());
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    function connect() {
      if (!isMountedRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      console.log("[WebSocket] Connecting to:", url);
      setStatus("connecting");

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) return;
          console.log("[WebSocket] Connected");
          setStatus("connected");
          reconnectAttemptsRef.current = 0;

          // Heartbeat: send ping every 25s, force-close if no pong within 5s
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
              heartbeatTimeoutRef.current = setTimeout(() => {
                console.warn("[WebSocket] Heartbeat timeout — closing dead connection");
                ws.close();
              }, 5000);
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;

          try {
            const message = JSON.parse(event.data);

            if (isDev) {
              console.log("[WebSocket] 📨 RAW MESSAGE:", message);
            }

            if (message.type === "pong") {
              // Clear heartbeat timeout — connection is alive
              if (heartbeatTimeoutRef.current) {
                clearTimeout(heartbeatTimeoutRef.current);
                heartbeatTimeoutRef.current = null;
              }
              return;
            }

            if (message.type === "snapshot" && Array.isArray(message.data)) {
              // Initial snapshot of all prices
              if (isDev) {
                console.log("[WebSocket] 📊 SNAPSHOT received with", message.data.length, "items");
                console.log("[WebSocket] 📋 First item structure:", message.data[0]);
              }

              const newData = new Map<string, PriceUpdate>();
              message.data.forEach((item: PriceUpdate) => {
                // Fix: Normalize symbol to lowercase for consistent lookup
                const normalizedSymbol = item.symbol.toLowerCase();
                newData.set(normalizedSymbol, item);
              });

              if (isDev) {
                console.log("[WebSocket] ✅ Snapshot processed. Keys:", Array.from(newData.keys()));
              }
              setMarketData(newData);
            } else if (message.type === "price_update" && message.data) {
              // Real-time price update
              const update: PriceUpdate = message.data;

              if (isDev) {
                console.log("[WebSocket] 💹 PRICE UPDATE:", {
                  symbol: update.symbol,
                  price: update.price,
                  priceChange: update.priceChange,
                  priceChangePercent: update.priceChangePercent,
                  volume: update.volume,
                  quoteVolume: update.quoteVolume,
                  allFields: update,
                });
              }

              setMarketData((prev) => {
                const newData = new Map(prev);
                // Fix: Normalize symbol to lowercase for consistent lookup
                const normalizedSymbol = update.symbol.toLowerCase();
                newData.set(normalizedSymbol, update);
                return newData;
              });
            } else if (message.type === "status" && message.data?.status) {
              // Server status update
              const serverStatus = message.data.status;
              if (isDev) {
                console.log("[WebSocket] 🔌 STATUS UPDATE:", serverStatus);
              }
              if (serverStatus === "connected") {
                setStatus("connected");
              } else if (serverStatus === "disconnected") {
                setStatus("disconnected");
              } else if (serverStatus === "error") {
                setStatus("error");
              }
            }
          } catch (error) {
            console.error("[WebSocket] Message parse error:", error);
          }
        };

        ws.onerror = () => {
          console.warn("[WebSocket] Connection error — will reconnect automatically");
          if (isMountedRef.current) {
            setStatus("error");
          }
        };

        ws.onclose = (event) => {
          console.log(`[WebSocket] Closed: ${event.code} - ${event.reason || "No reason"}`);
          wsRef.current = null;

          // Clear heartbeat timers on close
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
          }

          if (!isMountedRef.current) return;

          setStatus("disconnected");

          // Auto-reconnect with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;

          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        };
      } catch (error) {
        console.error("[WebSocket] Connection error:", error);
        if (isMountedRef.current) {
          setStatus("error");
        }
      }
    }

    connect();

    // Reconnect immediately when the tab becomes visible again (e.g. after sleep/wake)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log("[WebSocket] Tab visible — checking connection");
          reconnectAttemptsRef.current = 0; // reset backoff for immediate reconnect
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;

      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [url]);

  return {
    marketData,
    status,
  };
}
