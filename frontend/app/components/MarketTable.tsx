"use client";

import Link from "next/link";
import { useTranslation } from "@/src/i18n";
import {
  formatChange,
  formatPercent,
  formatPrice,
  formatVolume,
} from "@/src/utils/formatters";

export type MarketTableRow = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume?: number;
};

type MarketTableProps = {
  rows: MarketTableRow[];
  showVolume?: boolean;
};

const th = "px-3 py-2 font-medium sm:px-4 md:px-5";
const td = "px-3 py-1.5 sm:px-4 md:px-5";

export default function MarketTable({ rows, showVolume = false }: MarketTableProps) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[280px] text-base">
        <thead className="border-b border-black/10">
          <tr className="text-left">
            <th className={th}>{t("table.coin")}</th>
            <th className={th}>{showVolume ? t("table.price") : t("table.priceUSD")}</th>
            <th className={`${th} hidden md:table-cell`}>{t("table.change")}</th>
            <th className={th}>{t("table.percent")}</th>
            {showVolume && (
              <th className={`${th} hidden lg:table-cell whitespace-nowrap`}>
                24h Volume (USDT)
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10">
          {rows.map((coin) => {
            const isUp = coin.priceChange >= 0;
            const arrow = isUp ? "▲" : "▼";
            const changeClass = isUp ? "text-green-600" : "text-red-600";
            const changeSign = coin.priceChange > 0 ? "+" : "";
            const percentSign = coin.priceChangePercent > 0 ? "+" : "";

            return (
              <tr key={coin.id}>
                <td className={td}>
                  <div className="font-medium leading-tight">
                    <Link href={`/symbols/${coin.id}`}>{coin.name}</Link>
                  </div>
                  <div className="text-xs text-black/60">{coin.symbol}</div>
                </td>
                <td className={`${td} font-medium whitespace-nowrap`}>
                  {formatPrice(coin.price)}
                </td>
                <td className={`${td} hidden font-medium whitespace-nowrap md:table-cell ${changeClass}`}>
                  <span className="mr-1">{arrow}</span>
                  {changeSign}
                  {formatChange(coin.priceChange)}
                </td>
                <td className={`${td} font-medium whitespace-nowrap ${changeClass}`}>
                  <span className="mr-1 md:hidden">{arrow}</span>
                  {percentSign}
                  {formatPercent(coin.priceChangePercent)}%
                </td>
                {showVolume && (
                  <td className={`${td} hidden font-medium text-black/70 whitespace-nowrap lg:table-cell`}>
                    ${formatVolume(coin.volume ?? 0)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
