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
  "px-2 py-2 font-medium first:pl-0 last:pr-0 sm:px-3 md:px-4";
const td =
  "px-2 py-1.5 first:pl-0 last:pr-0 sm:px-3 md:px-4";

export default function MarketTable({ rows, showVolume = false }: MarketTableProps) {
  const { t } = useTranslation();

  // Extra columns sit off-screen; first 3 cols fill the viewport (Trading Economics style).
  const scrollExtra = showVolume ? "13rem" : "6rem";

  return (
    <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <table
        className="table-fixed text-xs sm:text-sm lg:table-auto lg:!w-full"
        style={{ width: `calc(100% + ${scrollExtra})` }}
      >
        <colgroup>
          <col style={{ width: `calc((100% - ${scrollExtra}) * 0.40)` }} />
          <col style={{ width: `calc((100% - ${scrollExtra}) * 0.34)` }} />
          <col style={{ width: `calc((100% - ${scrollExtra}) * 0.26)` }} />
          <col style={{ width: "6rem" }} />
          {showVolume && <col style={{ width: "7rem" }} />}
        </colgroup>
        <thead className="border-b border-black/10">
          <tr className="text-left">
            <th className={`${th} min-w-0`}>{t("table.coin")}</th>
            <th className={`${th} whitespace-nowrap text-right`}>{t("table.price")}</th>
            <th className={`${th} whitespace-nowrap text-right`}>
              {t("table.percent")}
            </th>
            <th className={`${th} whitespace-nowrap text-right pl-2`}>
              {t("table.change")}
            </th>
            {showVolume && (
              <th className={`${th} whitespace-nowrap text-right pl-2`}>
                <span className="hidden sm:inline">24h Volume (USDT)</span>
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
                <td className={`${td} min-w-0`}>
                  <div className="truncate font-medium leading-tight">
                    <Link href={`/symbols/${coin.id}`}>{coin.name}</Link>
                  </div>
                  <div className="truncate text-[10px] text-black/60 sm:text-xs">
                    {coin.symbol}
                  </div>
                </td>
                <td className={`${td} whitespace-nowrap text-right font-medium tabular-nums`}>
                  {formatPrice(coin.price)}
                </td>
                <td
                  className={`${td} whitespace-nowrap text-right font-medium tabular-nums ${changeClass}`}
                >
                  <span className="mr-0.5">{arrow}</span>
                  {percentSign}
                  {formatPercent(coin.priceChangePercent)}%
                </td>
                <td
                  className={`${td} whitespace-nowrap pl-2 text-right font-medium tabular-nums ${changeClass}`}
                >
                  {changeSign}
                  {formatChange(coin.priceChange)}
                </td>
                {showVolume && (
                  <td
                    className={`${td} whitespace-nowrap pl-2 text-right font-medium text-black/70 tabular-nums`}
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
