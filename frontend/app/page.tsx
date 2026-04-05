"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "../src/i18n";
import Image from "next/image";
import { useBinanceWebSocket } from "../src/hooks/useBinanceWebSocket";
import { COIN_METADATA } from "../src/constants/coinMetadata";
import { useEffect, useState } from "react";
import { formatPrice, formatChange, formatPercent } from "../src/utils/formatters";

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
  image: string | null;
  excerpt: string;
  content: string;
  source?: string;
  publishedAt?: string;
  url?: string;
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HomePage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const { t } = useTranslation();
  
  // Use WebSocket for live crypto data
  const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
  const marketWsUrl = `${wsBaseUrl.replace(/\/$/, "")}/ws/market`;
  const { marketData, status } = useBinanceWebSocket(marketWsUrl);

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

  const visibleCoins = coins.slice(0, 10);

  return (
    <main className="flex flex-col gap-6 lg:flex-row">
      <section className="w-full lg:w-3/5">
        <div className=" text-black">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold">{t("home.latestNews")}</span>
            <Link
              href="/news"
              className="text-gray-500 hover:text-gray-700 underline underline-offset-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-300 flex items-center gap-1"
            >
              {t("common.viewAll")} <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          {newsLoading ? (
            <div className="px-3 pb-2 text-sm">{t("common.loading")}</div>
          ) : newsError ? (
            <div className="px-3 pb-2 text-sm">{newsError}</div>
          ) : (
            <div className="space-y-6">
              {news.slice(0, 5).map((item) => (
                <article
                  key={item.id}
                  className="border-b border-black/10 pb-4 last:border-b-0 last:pb-0"
                >
                  <Link
                    href={`/news/${item.id}`}
                    className="flex gap-3 transition-colors hover:text-black"
                  >
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={128}
                        height={96}
                        className="h-24 w-32 shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <h2 className="mb-1 text-base font-semibold leading-snug">
                        {item.title}
                      </h2>
                      {(item.source || item.publishedAt) && (
                        <p className="mb-1 text-xs text-black/50">
                          {item.source}{item.source && item.publishedAt ? " · " : ""}{timeAgo(item.publishedAt)}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed text-black/80 line-clamp-2">
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
                          {formatChange(coin.priceChange)}
                        </span>
                      </td>
                      <td className={`px-5 py-1 font-medium ${changeClass}`}>
                        {percentSign}
                        {formatPercent(coin.priceChangePercent)}%
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
