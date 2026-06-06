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

const th =
  "px-2 py-2 font-medium whitespace-nowrap";
const td =
  "px-2 py-1.5 whitespace-nowrap";

export default function MarketTable({ rows, showVolume = false }: MarketTableProps) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <thead className="border-b border-black/10">
          <tr className="text-left">
            <th className={`${th}`}>{t("table.coin")}</th>
            <th className={`${th} text-right`}>{t("table.price")}</th>
            <th className={`${th} text-right`}>
              {t("table.percent")}
            </th>
            <th className={`${th} text-right`}>
              {t("table.change")}
            </th>
            {showVolume && (
              <th className={`${th} text-right`}>
                <span className="hidden sm:inline">24h Vol</span>
                <span className="sm:hidden">Vol</span>
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
                <td className={`${td}`}>
                  <div className="font-medium leading-tight">
                    <Link href={`/symbols/${coin.id}`}>{coin.name}</Link>
                  </div>
                  <div className="text-[10px] text-black/60 sm:text-xs">
                    {coin.symbol}
                  </div>
                </td>
                <td className={`${td} text-right font-medium tabular-nums`}>
                  {formatPrice(coin.price)}
                </td>
                <td
                  className={`${td} text-right font-medium tabular-nums ${changeClass}`}
                >
                  <span className="mr-0.5">{arrow}</span>
                  {percentSign}
                  {formatPercent(coin.priceChangePercent)}%
                </td>
                <td
                  className={`${td} text-right font-medium tabular-nums ${changeClass}`}
                >
                  {changeSign}
                  {formatChange(coin.priceChange)}
                </td>
                {showVolume && (
                  <td
                    className={`${td} text-right font-medium text-black/70 tabular-nums`}
                  >
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
