"use client";

import TradingViewWidget from "@/app/components/TradingViewWidget";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  trend: "up" | "down";
};

export default function CoinDetailsPage() {
  const params = useParams<{ id: string }>();
  const coinId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [coins, setCoins] = useState<Coin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coinId) return;

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
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load coins");
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
  }, [coinId]);

  const coin = useMemo(() => {
    if (!coinId) return null;
    return coins.find((c) => c.id === coinId) ?? null;
  }, [coins, coinId]);

  const visibleCoins = useMemo(() => coins.slice(0, 12), [coins]);

  const priceFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }),
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

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 text-black">
        <p>Loading…</p>
      </main>
    );
  }

  if (error || !coin) {
    return (
      <main className="min-h-screen p-6 text-black">
        <p>{error ?? "Coin not found."}</p>
        <div className="mt-3">
          <Link href="/market" className="underline">
            Back to market
          </Link>
        </div>
      </main>
    );
  }

  const tvSymbol = `BINANCE:${coin.symbol.toUpperCase()}USDT`;

  const isUp = coin.trend === "up";
  const changeClass = isUp ? "text-green-600" : "text-red-600";
  const arrow = isUp ? "▲" : "▼";
  const changeSign = coin.change > 0 ? "+" : "";
  const percentSign = coin.changePercent > 0 ? "+" : "";

  return (
    <main className="min-h-screen p-6 text-black">
      {/* Top summary "short table" */}
      <section className="rounded border border-black/10 bg-white">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-black/60">Coin</div>
            <div className="font-semibold">
              {coin.name} <span className="text-black/60">({coin.symbol})</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-black/60">Price</div>
            <div className="font-semibold">
              {priceFormatter.format(coin.price)}
            </div>
          </div>

          <div>
            <div className="text-xs text-black/60">Change</div>
            <div className={`font-semibold ${changeClass}`}>
              {arrow} {changeSign}
              {changeFormatter.format(coin.change)}
            </div>
          </div>

          <div>
            <div className="text-xs text-black/60">Change %</div>
            <div className={`font-semibold ${changeClass}`}>
              {percentSign}
              {percentFormatter.format(coin.changePercent)}%
            </div>
          </div>
        </div>
      </section>

      {/* 70/30 layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-10">
        <section className="rounded border border-black/10 bg-white lg:col-span-7">
          <div className="h-[70vh] min-h-[520px] w-full">
            <TradingViewWidget symbol={tvSymbol} theme="light" />
          </div>
        </section>

        <aside className="lg:col-span-3">
          <div className="rounded border border-black/10 bg-white text-black flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 shrink-0">
              <span className="text-sm font-semibold">Crypto Market</span>
              <Link
                href="/market"
                className="flex items-center gap-1 text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700"
              >
                View all <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            {/* Scroll area */}
            <div className="max-h-[60vh] lg:max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="sticky top-0 z-10 bg-white border-b border-black/10">
                  <tr className="text-left">
                    <th className="px-3 sm:px-5 py-2 font-medium">Coin</th>
                    <th className="px-3 sm:px-5 py-2 font-medium whitespace-nowrap">
                      Price
                    </th>
                    <th className="px-3 sm:px-5 py-2 font-medium whitespace-nowrap">
                      Change
                    </th>
                    <th className="px-3 sm:px-5 py-2 font-medium whitespace-nowrap">
                      %
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleCoins.map((c, idx) => {
                    const up = c.trend === "up";
                    const a = up ? "▲" : "▼";
                    const cls = up ? "text-green-600" : "text-red-600";
                    const cs = c.change > 0 ? "+" : "";
                    const ps = c.changePercent > 0 ? "+" : "";
                    const isLast = idx === visibleCoins.length - 1;

                    return (
                      <tr
                        key={c.id}
                        className={
                          !isLast ? "border-b border-black/10" : undefined
                        }
                      >
                        <td className="px-3 sm:px-5 py-2">
                          <div className="font-medium">
                            <Link href={`/symbols/${c.id}`}>{c.name}</Link>
                          </div>
                          <div className="text-xs text-black/60">
                            <Link href={`/symbols/${c.id}`}>{c.symbol}</Link>
                          </div>
                        </td>

                        <td className="px-3 sm:px-5 py-2 font-medium whitespace-nowrap">
                          {priceFormatter.format(c.price)}
                        </td>

                        <td
                          className={`px-3 sm:px-5 py-2 font-medium ${cls} whitespace-nowrap`}
                        >
                          <span className="mr-1">{a}</span>
                          {cs}
                          {changeFormatter.format(c.change)}
                        </td>

                        <td
                          className={`px-3 sm:px-5 py-2 font-medium ${cls} whitespace-nowrap`}
                        >
                          {ps}
                          {percentFormatter.format(c.changePercent)}%
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
