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

  return (
    <main className="min-h-screen p-4 sm:p-6 text-black">
      {/* Top summary */}
      <section className="rounded border border-black/10 bg-white">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-black/60">Coin</div>
            <div className="font-semibold">
              {coin.name}{" "}
              <span className="text-black/60">({coin.symbol})</span>
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
              {arrow} {changeFormatter.format(coin.change)}
            </div>
          </div>

          <div>
            <div className="text-xs text-black/60">Change %</div>
            <div className={`font-semibold ${changeClass}`}>
              {percentFormatter.format(coin.changePercent)}%
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
              <span className="text-sm font-semibold">Crypto Market</span>
              <Link
                href="/market"
                className="text-xs sm:text-sm text-gray-500 underline hover:text-gray-700"
              >
                View all →
              </Link>
            </div>

            <div className="max-h-[60vh] lg:max-h-[70vh] overflow-y-auto overflow-x-hidden">
              <table className="w-full text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 bg-white border-b border-black/10">
                  <tr className="text-left">
                    <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">
                      Coin
                    </th>
                    <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">
                      Price
                    </th>
                    <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">
                      Change
                    </th>
                    <th className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium">
                      %
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
                          {priceFormatter.format(c.price)}
                        </td>

                        <td
                          className={`px-2 sm:px-4 py-1.5 sm:py-2 font-medium ${cls}`}
                        >
                          {a} {changeFormatter.format(c.change)}
                        </td>

                        <td
                          className={`px-2 sm:px-4 py-1.5 sm:py-2 font-medium ${cls}`}
                        >
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
