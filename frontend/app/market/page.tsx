"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../src/i18n";

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
  const { t } = useTranslation();

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
          setError(e instanceof Error ? e.message : t("errors.failedLoadCoins"));
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
    <main className="text-black">
      <h1 className="text-lg font-semibold">{t("home.cryptoMarket")}</h1>

      <div className="mt-4">
        {isLoading ? (
          <div className="px-3 py-3 text-sm">{t("common.loading")}</div>
        ) : error ? (
          <div className="px-3 py-3 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-black/10">
              <tr className="text-left">
                <th className="px-5 py-5 font-bold ">{t("table.coin")}</th>
                <th className="px-5 py-5 font-bold">{t("table.priceUSD")}</th>
                <th className="px-5 py-5 font-bold">{t("table.change")}</th>
                <th className="px-5 py-5 font-bold ">{t("table.percent")}</th>
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
                      <div className="font-medium">
                        <Link
                          href={`/symbols/${coin.id}`}
                          className="font-medium"
                        >
                          {coin.name}
                        </Link>
                      </div>

                      <Link
                        href={`/symbols/${coin.id}`}
                        className="text-xs undertext-black/60"
                      >
                        {coin.symbol}
                      </Link>
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
