"use client";

import TradingViewWidget from "@/app/components/TradingViewWidget";
import { useTranslation } from "@/src/i18n";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useBinanceWebSocket } from "@/src/hooks/useBinanceWebSocket";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  trend: "up" | "down";
};

// Mapping of Binance symbols to coin metadata
const COIN_METADATA: Record<string, { id: string; name: string; symbol: string }> = {
  btcusdt: { id: "btc", name: "Bitcoin", symbol: "BTC" },
  ethusdt: { id: "eth", name: "Ethereum", symbol: "ETH" },
  bnbusdt: { id: "bnb", name: "BNB", symbol: "BNB" },
  solusdt: { id: "sol", name: "Solana", symbol: "SOL" },
  xrpusdt: { id: "xrp", name: "XRP", symbol: "XRP" },
  adausdt: { id: "ada", name: "Cardano", symbol: "ADA" },
  dogeusdt: { id: "doge", name: "Dogecoin", symbol: "DOGE" },
  trxusdt: { id: "trx", name: "TRON", symbol: "TRX" },
  maticusdt: { id: "matic", name: "Polygon", symbol: "MATIC" },
  linkusdt: { id: "link", name: "Chainlink", symbol: "LINK" },
  ltcusdt: { id: "ltc", name: "Litecoin", symbol: "LTC" },
  avaxusdt: { id: "avax", name: "Avalanche", symbol: "AVAX" },
  dotusdt: { id: "dot", name: "Polkadot", symbol: "DOT" },
  atomusdt: { id: "atom", name: "Cosmos", symbol: "ATOM" },
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

  const visibleCoins = useMemo(() => coins, [coins]); // Show all 14 coins

  const isLoading = status === "connecting";
  const error = status === "error" ? "WebSocket connection error" : null;

  // Smart price formatter: adjusts decimals based on price value
  const formatPrice = (price: number) => {
    if (price >= 1) {
      // For prices >= $1, show 2 decimals (e.g., $42,850.25)
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    } else if (price >= 0.01) {
      // For prices between $0.01 - $0.99, show 4 decimals (e.g., $0.1980)
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }).format(price);
    } else {
      // For very small prices < $0.01, show up to 8 decimals (e.g., $0.00000942)
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }).format(price);
    }
  };

  const changeFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

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
              {arrow} {changeFormatter.format(coin.priceChange)}
            </div>
          </div>

          <div>
            <div className="text-xs text-black/60">{t("table.percent")}</div>
            <div className={`font-semibold ${changeClass}`}>
              {percentFormatter.format(coin.priceChangePercent)}%
            </div>
          </div>
        </div>
      </section>

      {/* Responsive layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-10">
        {/* Chart */}
        <section className="rounded border border-black/10 bg-white lg:col-span-7">
          <div className="h-[60vh] sm:h-[65vh] lg:h-[70vh] min-h-[420px] w-full">
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
              <table className="w-full text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 bg-white border-b border-black/10">
                  <tr className="text-left">
                    <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">
                      {t("table.coin")}
                    </th>
                    <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">
                      {t("table.price")}
                    </th>
                    <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">
                      {t("table.change")}
                    </th>
                    <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">
                      {t("table.percent")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleCoins.map((c) => {
                    const up = c.trend === "up";
                    const cls = up ? "text-green-600" : "text-red-600";
                    const a = up ? "▲" : "▼";

                    return (
                      <tr key={c.id} className="border-b border-black/10">
                        <td className="px-2 sm:px-4 py-1.5 sm:py-2">
                          <div className="font-medium leading-tight">
                            <Link href={`/symbols/${c.id}`}>{c.name}</Link>
                          </div>
                          <div className="text-[10px] sm:text-xs text-black/60">
                            {c.symbol}
                          </div>
                        </td>

                        <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">
                          {formatPrice(c.price)}
                        </td>

                        <td
                          className={`px-2 sm:px-4 py-1.5 sm:py-2 font-medium ${cls}`}
                        >
                          {a} {changeFormatter.format(c.priceChange)}
                        </td>

                        <td
                          className={`px-2 sm:px-4 py-1.5 sm:py-2 font-medium ${cls}`}
                        >
                          {percentFormatter.format(c.priceChangePercent)}%
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
