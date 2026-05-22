"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useBinanceWebSocket } from "@/src/hooks/useBinanceWebSocket";
import { COIN_METADATA } from "@/src/constants/coinMetadata";
import MarketMovers from "@/app/components/MarketMovers";
import { useTranslation } from "@/src/i18n";
import { formatChange, formatPercent, formatPrice } from "@/src/utils/formatters";

type MarketRow = {
  key: string;
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  quoteVolume: number;
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
  const { t } = useTranslation();

  const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
  const marketWsUrl = `${wsBaseUrl.replace(/\/$/, "")}/ws/market`;
  const { marketData, status } = useBinanceWebSocket(marketWsUrl);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);

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

        const data = (await response.json()) as { articles: NewsItem[] };
        if (isMounted) setNews(Array.isArray(data.articles) ? data.articles : []);
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
  }, [t]);

  const marketRows = useMemo(() => {
    const rows: MarketRow[] = [];

    marketData.forEach((priceData, key) => {
      const metadata = COIN_METADATA[key];
      if (!metadata) return;

      rows.push({
        key,
        id: metadata.id,
        name: metadata.name,
        symbol: metadata.symbol,
        price: priceData.price,
        priceChange: Number.isFinite(priceData.priceChange) ? priceData.priceChange : 0,
        priceChangePercent: Number.isFinite(priceData.priceChangePercent)
          ? priceData.priceChangePercent
          : 0,
        quoteVolume: Number.isFinite(priceData.quoteVolume) ? priceData.quoteVolume : 0,
      });
    });

    return rows;
  }, [marketData]);

  const marketRowByKey = useMemo(() => {
    return new Map<string, MarketRow>(marketRows.map((row) => [row.key, row]));
  }, [marketRows]);

  const visibleCoins = useMemo(() => {
    const majorKeys = ["btcusdt", "ethusdt", "bnbusdt", "solusdt", "xrpusdt", "adausdt", "dogeusdt", "dotusdt", "avaxusdt", "linkusdt"];
    const picked: MarketRow[] = [];
    for (const key of majorKeys) {
      const row = marketRowByKey.get(key);
      if (row) picked.push(row);
    }
    if (picked.length < 10) {
      const byVolume = [...marketRows].sort((a, b) => b.quoteVolume - a.quoteVolume);
      for (const row of byVolume) {
        if (picked.length >= 10) break;
        if (picked.some((p) => p.key === row.key)) continue;
        picked.push(row);
      }
    }
    return picked.slice(0, 10);
  }, [marketRowByKey, marketRows]);

  const isLoading = status === "connecting";
  const error = status === "error" ? t("errors.websocketConnection") : null;

  return (
    <main className="text-black">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-6 py-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Never miss market-moving crypto posts again
            </h1>
            <p className="mt-2 text-base text-black/70 sm:text-lg">
              Real-time alerts for market-moving X posts, price swings, and breaking news — before the crowd reacts.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Get Alerts
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* News — same as dashboard */}
            <section className="w-full lg:w-3/5">
              <div className="text-black">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold">{t("home.latestNews")}</span>
                  <Link
                    href="/news"
                    className="flex items-center gap-1 text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
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
                                {item.source}
                                {item.source && item.publishedAt ? " · " : ""}
                                {timeAgo(item.publishedAt)}
                              </p>
                            )}
                            <p className="line-clamp-2 text-sm leading-relaxed text-black/80">
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

            {/* Market — same as dashboard */}
            <section className="w-full lg:w-2/5">
              <div className="text-black">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold">{t("home.cryptoMarket")}</span>
                  <Link
                    href="/market"
                    className="flex items-center gap-1 text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
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
                        <th className="px-5 py-2 font-medium">{t("table.priceUSD")}</th>
                        <th className="px-5 py-2 font-medium">{t("table.change")}</th>
                        <th className="px-5 py-2 font-medium">{t("table.percent")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCoins.map((coin, idx) => {
                        const isUp = coin.priceChange >= 0;
                        const arrow = isUp ? "▲" : "▼";
                        const changeClass = isUp ? "text-green-600" : "text-red-600";
                        const changeSign = coin.priceChange > 0 ? "+" : "";
                        const percentSign = coin.priceChangePercent > 0 ? "+" : "";
                        const isLast = idx === visibleCoins.length - 1;
                        return (
                          <tr
                            key={coin.key}
                            className={!isLast ? "border-b border-black/10" : undefined}
                          >
                            <td className="px-5 py-1">
                              <div className="font-medium">
                                <Link href={`/symbols/${coin.id}`} className="font-medium">
                                  {coin.name}
                                </Link>
                              </div>
                              <div className="text-xs text-black/60">
                                <Link href={`/symbols/${coin.id}`} className="font-medium">
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

              <div className="mt-4">
                <MarketMovers marketRows={marketRows} />
              </div>
            </section>
          </div>
        </section>

        

        </div>
    </main>
  );
}
