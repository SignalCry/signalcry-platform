"use client";

import { useMemo } from "react";
import { useTranslation } from "../../src/i18n";
import { useBinanceWebSocket } from "../../src/hooks/useBinanceWebSocket";
import { COIN_METADATA } from "../../src/constants/coinMetadata";
import { WS_BASE } from "../../src/constants/app";
import MarketTable from "../components/MarketTable";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
};

export default function MarketPage() {
  const { t } = useTranslation();
  const { marketData, status } = useBinanceWebSocket(`${WS_BASE}/ws/market`);

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
        volume: priceData.quoteVolume,
      });
    });

    return result;
  }, [marketData]);

  const isLoading = status === "connecting";
  const error = status === "error" ? t("errors.websocketConnection") : null;

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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">{t("home.cryptoMarket")}</h1>

        <div className="flex shrink-0 items-center gap-2 text-xs sm:text-sm">
          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-black/60">{statusText}</span>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="px-3 py-3 text-sm">{t("common.loading")}</div>
        ) : error ? (
          <div className="px-3 py-3 text-sm">{error}</div>
        ) : (
          <MarketTable rows={coins} showVolume />
        )}
      </div>
    </main>
  );
}
