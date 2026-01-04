"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
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
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCoins() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("http://localhost:4000/api/coins", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed to load coins (HTTP ${response.status})`);
        }

        const data = (await response.json()) as Coin[];
        if (isMounted) setCoins(Array.isArray(data) ? data : []);
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e.message : "Failed to load coins");
          setCoins([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadCoins();

    return () => {
      isMounted = false;
    };
  }, []);

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
          setNewsError(e instanceof Error ? e.message : "Failed to load news");
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

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 8,
      }),
    []
  );

  const changeFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
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
    <main className="flex min-h-screen flex-col gap-6 p-4 lg:flex-row">
      <section className="w-full lg:w-3/5">
        <div className=" text-black">
          <div className="px-3 py-2 text-sm font-semibold">Latest News</div>
          {newsLoading ? (
            <div className="px-3 pb-2 text-sm">Loading…</div>
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
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-24 w-32 flex-shrink-0 rounded object-cover"
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
            <span className="text-sm font-semibold">Crypto Market</span>
            <Link
              href="/market"
              className="text-gray-500 hover:text-gray-700 underline underline-offset-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-300 flex items-center gap-1"
            >
              View all <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="px-3 pb-1 text-sm">Loading…</div>
          ) : error ? (
            <div className="px-3 pb-3 text-sm">{error}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-5 py-2 font-medium">Coin</th>
                  <th className="px-5 py-2 font-medium ">
                    Price (USD)
                  </th>
                  <th className="px-5 py-2 font-medium">
                    Change
                  </th>
                  <th className="px-5 py-2 font-medium">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleCoins.map((coin, idx) => {
                  const isUp = coin.trend === "up";
                  const arrow = isUp ? "▲" : "▼";
                  const changeClass = isUp ? "text-green-600" : "text-red-600";

                  const changeSign = coin.change > 0 ? "+" : "";
                  const percentSign = coin.changePercent > 0 ? "+" : "";

                  const isLast = idx === visibleCoins.length - 1;
                  return (
                    <tr
                      key={coin.id}
                      className={
                        !isLast ? "border-b border-black/10" : undefined
                      }
                    >
                      <td className="px-5 py-1">
                        <div className="font-medium">{coin.name}</div>
                        <div className="text-xs text-black/60">{coin.symbol}</div>
                      </td>
                      <td className="px-5 py-1 font-medium">
                        {priceFormatter.format(coin.price)}
                      </td>
                      <td
                        className={`px-5 py-1 font-medium ${changeClass}`}
                      >
                        <span className="mr-1">{arrow}</span>
                        <span>
                          {changeSign}
                          {changeFormatter.format(coin.change)}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-1 font-medium ${changeClass}`}
                      >
                        {percentSign}
                        {percentFormatter.format(coin.changePercent)}%
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
