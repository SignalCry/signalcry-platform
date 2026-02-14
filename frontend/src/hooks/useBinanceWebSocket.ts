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

export function useBinanceWebSocket(url: string) {
  const [marketData, setMarketData] = useState<MarketData>(new Map());
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

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
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;

          try {
            const message = JSON.parse(event.data);

            // 🔍 DEBUG: Log all received messages
            console.log("[WebSocket] 📨 RAW MESSAGE:", message);

            if (message.type === "snapshot" && Array.isArray(message.data)) {
              // Initial snapshot of all prices
              console.log("[WebSocket] 📊 SNAPSHOT received with", message.data.length, "items");
              console.log("[WebSocket] 📋 First item structure:", message.data[0]);
              
              const newData = new Map<string, PriceUpdate>();
              message.data.forEach((item: PriceUpdate) => {
                // Fix: Normalize symbol to lowercase for consistent lookup
                const normalizedSymbol = item.symbol.toLowerCase();
                newData.set(normalizedSymbol, item);
              });
              
              console.log("[WebSocket] ✅ Snapshot processed. Keys:", Array.from(newData.keys()));
              setMarketData(newData);
            } else if (message.type === "price_update" && message.data) {
              // Real-time price update
              const update: PriceUpdate = message.data;
              
              // 🔍 DEBUG: Log each price update
              console.log("[WebSocket] 💹 PRICE UPDATE:", {
                symbol: update.symbol,
                price: update.price,
                priceChange: update.priceChange,
                priceChangePercent: update.priceChangePercent,
                volume: update.volume,
                quoteVolume: update.quoteVolume,
                allFields: update // Show all available fields
              });
              
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
              console.log("[WebSocket] 🔌 STATUS UPDATE:", serverStatus);
              if (serverStatus === "connected") {
                setStatus("connected");
              } else if (serverStatus === "disconnected" || serverStatus === "error") {
                setStatus("error");
              }
            }
          } catch (error) {
            console.error("[WebSocket] Message parse error:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[WebSocket] Error:", error);
          if (isMountedRef.current) {
            setStatus("error");
          }
        };

        ws.onclose = (event) => {
          console.log(`[WebSocket] Closed: ${event.code} - ${event.reason || "No reason"}`);
          wsRef.current = null;

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

    return () => {
      isMountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
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
