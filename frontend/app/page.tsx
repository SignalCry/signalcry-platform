"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useBinanceWebSocket } from "@/src/hooks/useBinanceWebSocket";
import { COIN_METADATA } from "@/src/constants/coinMetadata";
import { useTranslation } from "@/src/i18n";
import { formatPercent, formatPrice, formatVolume } from "@/src/utils/formatters";

type MarketRow = {
  key: string;
  id: string;
  name: string;
  symbol: string;
  price: number;
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

function ChangePill({ value }: { value: number }) {
  const isUp = value > 0;
  const isDown = value < 0;
  const color = isUp ? "text-green-600" : isDown ? "text-red-600" : "text-black/60";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`font-semibold ${color}`}>
      {sign}
      {formatPercent(value)}%
    </span>
  );
}

function MoverRow({ row }: { row: MarketRow }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{row.name}</div>
        <div className="text-xs text-black/50">{row.symbol}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold">{formatPrice(row.price)}</div>
        <div className="text-xs">
          <ChangePill value={row.priceChangePercent} />
        </div>
      </div>
    </div>
  );
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

  const mostActive = useMemo(() => {
    return [...marketRows].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 5);
  }, [marketRows]);

  const compactSnapshot = useMemo(() => {
    const majorKeys = ["btcusdt", "ethusdt", "bnbusdt", "solusdt", "xrpusdt", "adausdt"];

    const picked: MarketRow[] = [];
    for (const key of majorKeys) {
      const row = marketRowByKey.get(key);
      if (row) picked.push(row);
    }

    if (picked.length < 6) {
      const byVolume = [...marketRows].sort((a, b) => b.quoteVolume - a.quoteVolume);
      for (const row of byVolume) {
        if (picked.length >= 6) break;
        if (picked.some((p) => p.key === row.key)) continue;
        picked.push(row);
      }
    }

    return picked.slice(0, 6);
  }, [marketRowByKey, marketRows]);

  const topGainers = useMemo(() => {
    return [...marketRows]
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, 5);
  }, [marketRows]);

  const topLosers = useMemo(() => {
    return [...marketRows]
      .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, 5);
  }, [marketRows]);

  const marketIsLoading = status === "connecting" && marketRows.length === 0;
  const marketIsError = status === "error";

  const [activeMoverTab, setActiveMoverTab] = useState<"gainers" | "losers" | "active">("gainers");
  const activeMoverRows =
    activeMoverTab === "gainers"
      ? topGainers
      : activeMoverTab === "losers"
      ? topLosers
      : mostActive;
  const activeMoverTitle =
    activeMoverTab === "gainers"
      ? "Top Gainers"
      : activeMoverTab === "losers"
      ? "Top Losers"
      : "Most Active";

  const visibleNews = news.slice(0, 3);

  return (
    <main className="text-black">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-6 py-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Real-time crypto intelligence for traders
            </h1>
            <p className="mt-2 text-base text-black/70 sm:text-lg">
              Track live prices, news, indicators, and X posts that may move the market.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Open Dashboard
              </Link>
              <Link
                href="/market"
                className="inline-flex items-center justify-center rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                View Market
              </Link>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
              <div className="rounded-xl border border-black/10">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <h2 className="text-sm font-semibold">Latest News</h2>
                  <Link
                    href="/news"
                    className="text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    View all news <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>

                {newsLoading ? (
                  <div className="px-4 pb-4 text-sm">{t("common.loading")}</div>
                ) : newsError ? (
                  <div className="px-4 pb-4 text-sm">{newsError}</div>
                ) : visibleNews.length === 0 ? (
                  <div className="px-4 pb-4 text-sm text-black/60">No news yet.</div>
                ) : (
                  <div className="divide-y divide-black/10">
                    {visibleNews.map((item) => (
                      <article key={item.id} className="px-4 py-4">
                        <Link
                          href={`/news/${item.id}`}
                          className="flex gap-4 transition-colors hover:text-black"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.title}
                              width={160}
                              height={120}
                              className="h-20 w-32 shrink-0 rounded object-cover"
                            />
                          ) : null}

                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                              {item.title}
                            </h3>
                            {(item.source || item.publishedAt) && (
                              <p className="mt-1 text-xs text-black/50">
                                {item.source}
                                {item.source && item.publishedAt ? " · " : ""}
                                {timeAgo(item.publishedAt)}
                              </p>
                            )}
                            <p className="mt-2 text-xs leading-relaxed text-black/70 line-clamp-2">
                              {item.excerpt}
                            </p>
                          </div>
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-black/10 overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <h2 className="text-sm font-semibold">Market Snapshot</h2>
                  <Link
                    href="/market"
                    className="text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    View full market <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>

                {marketIsLoading ? (
                  <div className="px-4 pb-4 text-sm">{t("common.loading")}</div>
                ) : marketIsError ? (
                  <div className="px-4 pb-4 text-sm">{t("errors.websocketConnection")}</div>
                ) : compactSnapshot.length === 0 ? (
                  <div className="px-4 pb-4 text-sm text-black/60">No market data yet.</div>
                ) : (
                  <div className="overflow-x-auto px-2 pb-2">
                    <table className="w-full text-sm">
                      <thead className="border-b border-black/10">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-bold">Coin</th>
                          <th className="px-3 py-2 font-bold">Price</th>
                          <th className="px-3 py-2 font-bold">24h %</th>
                          <th className="px-3 py-2 font-bold">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {compactSnapshot.map((row) => (
                          <tr key={row.key}>
                            <td className="px-3 py-2">
                              <div className="font-medium">{row.name}</div>
                              <div className="text-xs text-black/50">{row.symbol}</div>
                            </td>
                            <td className="px-3 py-2 font-semibold">{formatPrice(row.price)}</td>
                            <td className="px-3 py-2">
                              <ChangePill value={row.priceChangePercent} />
                            </td>
                            <td className="px-3 py-2 font-medium text-black/70">
                              ${formatVolume(row.quoteVolume)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-black/10">
                <div className="flex flex-wrap gap-2 border-b border-black/10 px-4 py-3">
                  {[
                    { id: "gainers", label: "Top Gainers" },
                    { id: "losers", label: "Top Losers" },
                    { id: "active", label: "Top Active" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveMoverTab(tab.id as "gainers" | "losers" | "active")}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        activeMoverTab === tab.id
                          ? "bg-black text-white"
                          : "bg-gray-100 text-black/70 hover:bg-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="px-4 py-4">
                  <div className="text-sm font-semibold">{activeMoverTitle}</div>
                  {marketIsLoading ? (
                    <div className="mt-3 text-sm">{t("common.loading")}</div>
                  ) : marketIsError ? (
                    <div className="mt-3 text-sm">{t("errors.websocketConnection")}</div>
                  ) : activeMoverRows.length === 0 ? (
                    <div className="mt-3 text-sm text-black/60">No market movers yet.</div>
                  ) : (
                    <div className="mt-3 divide-y divide-black/10">
                      {activeMoverRows.map((row) => (
                        <div key={row.key} className="first:pt-0 last:pb-0">
                          <MoverRow row={row} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4) X Intelligence Preview */}
          <section className="rounded-xl border border-black/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">X Intelligence</h2>
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-black/70">
                Coming soon
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-black/70">
              Track influential crypto accounts and detect posts that may affect
              coins or the overall market.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                "High-impact BTC post detected",
                "SOL sentiment spike",
                "Market-wide bearish discussion increasing",
              ].map((title) => (
                <div
                  key={title}
                  className="rounded-lg border border-black/10 bg-white p-4"
                >
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-1 text-xs text-black/50">Preview</div>
                </div>
              ))}
            </div>
          </section>

          {/* 5) Indicators Preview */}
          <section className="rounded-xl border border-black/10">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <h2 className="text-sm font-semibold">Indicators Preview</h2>
              <Link
                href="/indicators"
                className="text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                View indicators <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
              {["indicators.ema", "indicators.rsi", "indicators.macd", "indicators.bb"].map(
                (key) => (
                  <div
                    key={key}
                    className="rounded-lg border border-black/10 bg-white p-4"
                  >
                    <div className="text-sm font-semibold">{t(key)}</div>
                    <div className="mt-1 text-xs text-black/50">Preview</div>
                  </div>
                )
              )}
            </div>
          </section>
        </div>
    </main>
  );
}
