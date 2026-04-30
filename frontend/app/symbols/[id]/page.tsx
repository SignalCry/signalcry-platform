"use client";

import TradingViewWidget from "@/app/components/TradingViewWidget";
import { useTranslation } from "@/src/i18n";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useBinanceWebSocket } from "@/src/hooks/useBinanceWebSocket";
import { COIN_METADATA } from "@/src/constants/coinMetadata";
import { formatPrice, formatChange, formatPercent } from "@/src/utils/formatters";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  trend: "up" | "down";
};

export default function CoinDetailsPage() {
  const params = useParams<{ id: string }>();
  const coinId = Array.isArray(params?.id) ? params.id[0] : params?.id;
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
        trend: priceData.priceChange >= 0 ? "up" : "down",
      });
    });

    return result;
  }, [marketData]);

  const coin = useMemo(() => {
    if (!coinId) return null;
    return coins.find((c) => c.id === coinId) ?? null;
  }, [coins, coinId]);

  const isLoading = status === "connecting";
  const error = status === "error" ? "WebSocket connection error" : null;

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 text-black">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  if (error || !coin) {
    return (
      <main className="min-h-screen p-6 text-black">
        <p>{error ?? t("symbols.notFound")}</p>
        <div className="mt-3">
          <Link href="/market" className="underline">
            {t("symbols.backToMarket")}
          </Link>
        </div>
      </main>
    );
  }

  const tvSymbol = `BINANCE:${coin.symbol.toUpperCase()}USDT`;
  const isUp = coin.trend === "up";
  const changeClass = isUp ? "text-green-600" : "text-red-600";
  const arrow = isUp ? "▲" : "▼";

  return (
    <main className="min-h-screen p-4 sm:p-6 text-black">
      {/* Top summary */}
      <section className="rounded border border-black/10 bg-white">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-black/60">{t("table.coin")}</div>
            <div className="font-semibold">
              {coin.name}{" "}
              <span className="text-black/60">({coin.symbol})</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-black/60">{t("table.price")}</div>
            <div className="font-semibold">
              {formatPrice(coin.price)}
            </div>
          </div>

          <div>
            <div className="text-xs text-black/60">{t("table.change")}</div>
            <div className={`font-semibold ${changeClass}`}>
              {arrow} {formatChange(coin.priceChange)}
            </div>
          </div>

          <div>
            <div className="text-xs text-black/60">{t("table.percent")}</div>
            <div className={`font-semibold ${changeClass}`}>
              {formatPercent(coin.priceChangePercent)}%
            </div>
          </div>
        </div>
      </section>

      {/* Responsive layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-10">
        {/* Chart */}
        <section className="rounded border border-black/10 bg-white lg:col-span-7">
          <div className="h-[60vh] sm:h-[65vh] lg:h-[70vh] min-h-105 w-full">
            <TradingViewWidget symbol={tvSymbol} theme="light" />
          </div>
        </section>

        {/* Market table */}
        <aside className="lg:col-span-3">
          <div className="rounded border border-black/10 bg-white flex flex-col">
              <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold">{t("home.cryptoMarket")}</span>
              <Link
                href="/market"
                className="text-xs sm:text-sm text-gray-500 underline hover:text-gray-700"
              >
                {t("common.viewAll")} →
              </Link>
            </div>

            <div className="max-h-[60vh] lg:max-h-[70vh] overflow-y-auto overflow-x-hidden">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-white border-b border-black/10">
                  <tr className="text-left">
                    <th className="px-1.5 py-1 font-medium">
                      {t("table.coin")}
                    </th>
                    <th className="px-1.5 py-1 font-medium">
                      {t("table.price")}
                    </th>
                    <th className="px-1.5 py-1 font-medium">
                      {t("table.change")}
                    </th>
                    <th className="px-1.5 py-1 font-medium">
                      {t("table.percent")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {coins.map((c) => {
                    const up = c.trend === "up";
                    const cls = up ? "text-green-600" : "text-red-600";
                    const a = up ? "▲" : "▼";

                    return (
                      <tr key={c.id} className="border-b border-black/10">
                        <td className="px-1.5 py-1">
                          <div className="font-medium leading-tight">
                            <Link href={`/symbols/${c.id}`}>{c.name}</Link>
                          </div>
                          <div className="text-[10px] text-black/60">
                            {c.symbol}
                          </div>
                        </td>

                        <td className="px-1.5 py-1 font-medium">
                          {formatPrice(c.price)}
                        </td>

                        <td
                          className={`px-1.5 py-1 font-medium ${cls}`}
                        >
                          {a} {formatChange(c.priceChange)}
                        </td>

                        <td
                          className={`px-1.5 py-1 font-medium ${cls}`}
                        >
                          {formatPercent(c.priceChangePercent)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
