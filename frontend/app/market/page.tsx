"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "../../src/i18n";
import { useBinanceWebSocket } from "../../src/hooks/useBinanceWebSocket";
import { COIN_METADATA } from "../../src/constants/coinMetadata";
import { formatPrice, formatChange, formatPercent, formatVolume } from "../../src/utils/formatters";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  trend: "up" | "down";
};

export default function MarketPage() {
  const { t } = useTranslation();
  const { marketData, status } = useBinanceWebSocket("ws://localhost:4000/ws/market");

  // Transform WebSocket data to Coin array
  const coins = useMemo(() => {
    const result: Coin[] = [];

    marketData.forEach((priceData, symbol) => {
      const metadata = COIN_METADATA[symbol];
      if (!metadata) return;

      result.push({
        id: metadata.id,
        name: metadata.name,
        symbol: metadata.symbol,
        price: priceData.price,
        priceChange: priceData.priceChange,
        priceChangePercent: priceData.priceChangePercent,
        volume: priceData.quoteVolume, // Use USDT volume for easier reading
        trend: priceData.priceChange >= 0 ? "up" : "down",
      });
    });

    return result;
  }, [marketData]);

  const isLoading = status === "connecting";
  const error = status === "error" ? "WebSocket connection error" : null;

  // Connection status indicator
  const statusColor = {
    connecting: "bg-yellow-500",
    connected: "bg-green-500",
    disconnected: "bg-gray-500",
    error: "bg-red-500",
  }[status];

  const statusText = {
    connecting: "Connecting...",
    connected: "Live",
    disconnected: "Disconnected",
    error: "Error",
  }[status];

  return (
    <main className="text-black">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("home.cryptoMarket")}</h1>
        
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`h-2 w-2 rounded-full ${statusColor}`}></div>
          <span className="text-black/60">{statusText}</span>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="px-3 py-3 text-sm">{t("common.loading")}</div>
        ) : error ? (
          <div className="px-3 py-3 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-black/10">
              <tr className="text-left">
                <th className="px-5 py-5 font-bold">{t("table.coin")}</th>
                <th className="px-5 py-5 font-bold">Price</th>
                <th className="px-5 py-5 font-bold">24h Change</th>
                <th className="px-5 py-5 font-bold">24h Change %</th>
                <th className="px-5 py-5 font-bold">24h Volume (USDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {coins.map((coin) => {
                const isUp = coin.trend === "up";
                const arrow = isUp ? "▲" : "▼";
                const changeClass = isUp ? "text-green-600" : "text-red-600";

                const changeSign = coin.priceChange > 0 ? "+" : "";
                const percentSign = coin.priceChangePercent > 0 ? "+" : "";

                return (
                  <tr key={coin.id}>
                    <td className="px-5 py-1.5">
                      <div className="font-medium">
                        <Link
                          href={`/symbols/${coin.id}`}
                          className="font-medium"
                        >
                          {coin.name}
                        </Link>
                      </div>

                      <Link
                        href={`/symbols/${coin.id}`}
                        className="text-xs undertext-black/60"
                      >
                        {coin.symbol}
                      </Link>
                    </td>
                    <td className="px-5 py-1.5 font-medium">
                      {formatPrice(coin.price)}
                    </td>
                    <td className={`px-5 py-1.5 font-medium ${changeClass}`}>
                      <span className="mr-1">{arrow}</span>
                      <span>
                        {changeSign}
                        {formatChange(coin.priceChange)}
                      </span>
                    </td>
                    <td className={`px-5 py-1.5 font-medium ${changeClass}`}>
                      {percentSign}
                      {formatPercent(coin.priceChangePercent)}%
                    </td>
                    <td className="px-5 py-1.5 font-medium text-black/70">
                      ${formatVolume(coin.volume)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
