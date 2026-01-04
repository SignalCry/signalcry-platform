"use client";

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

export default function MarketPage() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen p-4 text-black">
      <h1 className="text-lg font-semibold">Crypto Market</h1>

      <div className="mt-4">
        {isLoading ? (
          <div className="px-3 py-3 text-sm">Loading…</div>
        ) : error ? (
          <div className="px-3 py-3 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-black/10">
              <tr className="text-left">
                <th className="px-5 py-5 font-bold ">Coin</th>
                <th className="px-5 py-5 font-bold">
                  Price (USD)
                </th>
                <th className="px-5 py-5 font-bold">
                  Change
                </th>
                <th className="px-5 py-5 font-bold ">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {coins.map((coin) => {
                const isUp = coin.trend === "up";
                const arrow = isUp ? "▲" : "▼";
                const changeClass = isUp ? "text-green-600" : "text-red-600";

                const changeSign = coin.change > 0 ? "+" : "";
                const percentSign = coin.changePercent > 0 ? "+" : "";

                return (
                  <tr key={coin.id}>
                    <td className="px-5 py-1.5">
                      <div className="font-medium">{coin.name}</div>
                      <div className="text-xs text-black/60">{coin.symbol}</div>
                    </td>
                    <td className="px-5 py-1.5 font-medium">
                      {priceFormatter.format(coin.price)}
                    </td>
                    <td
                      className={`px-5 py-1.5 font-medium ${changeClass}`}
                    >
                      <span className="mr-1">{arrow}</span>
                      <span>
                        {changeSign}
                        {changeFormatter.format(coin.change)}
                      </span>
                    </td>
                    <td
                      className={`px-5 py-1.5 font-medium${changeClass}`}
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
    </main>
  );
}
