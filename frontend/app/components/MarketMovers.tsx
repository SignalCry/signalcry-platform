"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice, formatPercent } from "@/src/utils/formatters";

type MarketRow = {
  key: string;
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChangePercent: number;
  quoteVolume: number;
};

type Tab = "gainers" | "losers" | "active";

const TABS: { key: Tab; label: string }[] = [
  { key: "gainers", label: "Top Gainers" },
  { key: "losers", label: "Top Losers" },
  { key: "active", label: "Most Active" },
];

export default function MarketMovers({ marketRows }: { marketRows: MarketRow[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("gainers");

  const rows = (() => {
    if (activeTab === "gainers") {
      return [...marketRows].sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 5);
    }
    if (activeTab === "losers") {
      return [...marketRows].sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, 5);
    }
    return [...marketRows].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 5);
  })();

  return (
    <div className="text-black">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-black/10">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
              activeTab === tab.key
                ? "border-b-2 border-black text-black"
                : "text-black/40 hover:text-black/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div>
        {rows.map((coin, idx) => {
          const isUp = coin.priceChangePercent >= 0;
          const changeClass = isUp ? "text-green-600" : "text-red-600";
          const percentSign = coin.priceChangePercent > 0 ? "+" : "";
          const isLast = idx === rows.length - 1;

          return (
            <Link
              key={coin.key}
              href={`/symbols/${coin.id}`}
              className={`flex items-center justify-between px-5 py-1 hover:bg-black/5 transition-colors ${
                !isLast ? "border-b border-black/10" : ""
              }`}
            >
              <div>
                <div className="text-sm font-medium">{coin.name}</div>
                <div className="text-xs text-black/60">{coin.symbol}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatPrice(coin.price)}</div>
                <div className={`text-xs font-medium ${changeClass}`}>
                  {percentSign}{formatPercent(coin.priceChangePercent)}%
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
