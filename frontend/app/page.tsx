"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "../src/i18n";
import Image from "next/image";
import { useBinanceWebSocket } from "../src/hooks/useBinanceWebSocket";
import { useEffect, useState } from "react";

// Pre-built formatters reused across all formatPrice calls to avoid
// creating a new Intl.NumberFormat instance on every render cycle.
const priceFormatter2dp = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const priceFormatter4dp = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const priceFormatter8dp = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 8,
});

type Coin = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  trend: "up" | "down";
};

type NewsItem = {
  id: string;
  title: string;
  image: string;
  excerpt: string;
  content: string;
};

export default function HomePage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const { t } = useTranslation();
  
  // Use WebSocket for live crypto data
  const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
  const marketWsUrl = `${wsBaseUrl.replace(/\/$/, "")}/ws/market`;
  const { marketData, status } = useBinanceWebSocket(marketWsUrl);

  // Mapping of Binance symbols to coin metadata (same as market page)
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

  const isLoading = status === "connecting";
  const error = status === "error" ? t("errors.websocketConnection") : null;

  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      try {
        setNewsLoading(true);
        setNewsError(null);

        const response = await fetch("http://localhost:4000/api/news", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed to load news (HTTP ${response.status})`);
        }

        const data = (await response.json()) as NewsItem[];
        if (isMounted) setNews(Array.isArray(data) ? data : []);
      } catch (e) {
        if (isMounted) {
          setNewsError(e instanceof Error ? e.message : t("errors.failedLoadNews"));
          setNews([]);
        }
      } finally {
        if (isMounted) setNewsLoading(false);
      }
    }

    void loadNews();

    return () => {
      isMounted = false;
    };
  }, []);

  // Smart price formatter: adjusts decimals based on price value
  const formatPrice = (price: number) => {
    if (price >= 1) {
      // For prices >= $1, show 2 decimals (e.g., $42,850.25)
      return priceFormatter2dp.format(price);
    } else if (price >= 0.01) {
      // For prices between $0.01 - $0.99, show 4 decimals (e.g., $0.1980)
      return priceFormatter4dp.format(price);
    } else {
      // For very small prices < $0.01, show up to 8 decimals (e.g., $0.00000942)
      return priceFormatter8dp.format(price);
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

  const visibleCoins = coins.slice(0, 10);

  return (
    <main className="flex flex-col gap-6 lg:flex-row">
      <section className="w-full lg:w-3/5">
        <div className=" text-black">
          <div className="px-3 py-2 text-sm font-semibold">{t("home.latestNews")}</div>
          {newsLoading ? (
            <div className="px-3 pb-2 text-sm">{t("common.loading")}</div>
          ) : newsError ? (
            <div className="px-3 pb-2 text-sm">{newsError}</div>
          ) : (
            <div className="space-y-6">
              {news.map((item) => (
                <article
                  key={item.id}
                  className="border-b border-black/10 pb-4 last:border-b-0 last:pb-0"
                >
                  <Link
                    href={`/news/${item.id}`}
                    className="flex gap-3 transition-colors hover:text-black"
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={128}
                      height={96}
                      className="h-24 w-32 shrink-0 rounded object-cover"
                    />
                    <div>
                      <h2 className="mb-2 text-base font-semibold leading-snug">
                        {item.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-black/80">
                        {item.excerpt}
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="w-full lg:w-2/5">
        <div className=" text-black">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold">{t("home.cryptoMarket")}</span>
            <Link
              href="/market"
              className="text-gray-500 hover:text-gray-700 underline underline-offset-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-300 flex items-center gap-1"
            >
              {t("common.viewAll")} <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="px-3 pb-1 text-sm">{t("common.loading")}</div>
          ) : error ? (
            <div className="px-3 pb-3 text-sm">{error}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-5 py-2 font-medium">{t("table.coin")}</th>
                  <th className="px-5 py-2 font-medium ">{t("table.priceUSD")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.change")}</th>
                  <th className="px-5 py-2 font-medium">{t("table.percent")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleCoins.map((coin, idx) => {
                  const isUp = coin.trend === "up";
                  const arrow = isUp ? "▲" : "▼";
                  const changeClass = isUp ? "text-green-600" : "text-red-600";

                  const changeSign = coin.priceChange > 0 ? "+" : "";
                  const percentSign = coin.priceChangePercent > 0 ? "+" : "";

                  const isLast = idx === visibleCoins.length - 1;
                  return (
                    <tr
                      key={coin.id}
                      className={
                        !isLast ? "border-b border-black/10" : undefined
                      }
                    >
                      <td className="px-5 py-1">
                        <div className="font-medium">
                          <Link
                            href={`/symbols/${coin.id}`}
                            className="font-medium"
                          >
                            {coin.name}
                          </Link>
                        </div>
                        <div className="text-xs text-black/60">
                          <Link
                            href={`/symbols/${coin.id}`}
                            className="font-medium"
                          >
                            {coin.symbol}
                          </Link>
                        </div>
                      </td>
                      <td className="px-5 py-1 font-medium">
                        {formatPrice(coin.price)}
                      </td>
                      <td className={`px-5 py-1 font-medium ${changeClass}`}>
                        <span className="mr-1">{arrow}</span>
                        <span>
                          {changeSign}
                          {changeFormatter.format(coin.priceChange)}
                        </span>
                      </td>
                      <td className={`px-5 py-1 font-medium ${changeClass}`}>
                        {percentSign}
                        {percentFormatter.format(coin.priceChangePercent)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
