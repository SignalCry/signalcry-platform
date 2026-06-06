"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "../../src/i18n";
import { API_BASE } from "../../src/constants/app";

type EmaData = {
  value: number;
  trend: "bullish" | "bearish";
} | null;

type Indicator = {
  symbol: string;
  price: number;
  ema: { ema20: EmaData; ema50: EmaData; ema200: EmaData };
  rsi: { value: number; condition: "overbought" | "oversold" | "neutral" } | null;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    momentum: "bullish" | "bearish";
  } | null;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    status: "overextended" | "rebound_zone" | "within_bands";
  } | null;
  updatedAt: number;
};

const COIN_NAMES: Record<string, { name: string; symbol: string }> = {
  btcusdt: { name: "Bitcoin", symbol: "BTC" },
  ethusdt: { name: "Ethereum", symbol: "ETH" },
  bnbusdt: { name: "BNB", symbol: "BNB" },
  solusdt: { name: "Solana", symbol: "SOL" },
  xrpusdt: { name: "XRP", symbol: "XRP" },
  adausdt: { name: "Cardano", symbol: "ADA" },
  dogeusdt: { name: "Dogecoin", symbol: "DOGE" },
  trxusdt: { name: "TRON", symbol: "TRX" },
  maticusdt: { name: "Polygon", symbol: "MATIC" },
  linkusdt: { name: "Chainlink", symbol: "LINK" },
  ltcusdt: { name: "Litecoin", symbol: "LTC" },
  avaxusdt: { name: "Avalanche", symbol: "AVAX" },
  dotusdt: { name: "Polkadot", symbol: "DOT" },
  atomusdt: { name: "Cosmos", symbol: "ATOM" },
};

function TrendBadge({ trend }: { trend: "bullish" | "bearish" }) {
  const isBull = trend === "bullish";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
        isBull ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {isBull ? "Bullish" : "Bearish"}
    </span>
  );
}

function RsiBadge({ condition }: { condition: string }) {
  const color =
    condition === "overbought"
      ? "bg-red-100 text-red-700"
      : condition === "oversold"
        ? "bg-green-100 text-green-700"
        : "bg-gray-100 text-black/60";
  const label =
    condition === "overbought"
      ? "Overbought"
      : condition === "oversold"
        ? "Oversold"
        : "Neutral";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}

function BbBadge({ status }: { status: string }) {
  const color =
    status === "overextended"
      ? "bg-red-100 text-red-700"
      : status === "rebound_zone"
        ? "bg-green-100 text-green-700"
        : "bg-gray-100 text-black/60";
  const label =
    status === "overextended"
      ? "Overextended"
      : status === "rebound_zone"
        ? "Rebound Zone"
        : "Within Bands";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}

function formatNum(n: number, decimals = 2): string {
  if (n >= 1) {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  } else if (n >= 0.01) {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(n);
  } else {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(n);
  }
}

export default function IndicatorsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Indicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "ema" | "rsi" | "macd" | "bb"
  >("ema");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/indicators`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Indicator[];
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.failedLoadIndicators"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Sort by market cap order (same order as COIN_NAMES keys)
  const sorted = useMemo(() => {
    const order = Object.keys(COIN_NAMES);
    return [...data].sort(
      (a, b) => order.indexOf(a.symbol) - order.indexOf(b.symbol)
    );
  }, [data]);

  const tabs = [
    { key: "ema" as const, label: t("indicators.ema") },
    { key: "rsi" as const, label: t("indicators.rsi") },
    { key: "macd" as const, label: t("indicators.macd") },
    { key: "bb" as const, label: t("indicators.bb") },
  ];

  return (
    <main className="text-black">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {t("indicators.title")}
        </h1>
        <span className="text-xs text-black/40">1h</span>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-black/10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-black text-black"
                : "text-black/40 hover:text-black/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="px-3 py-3 text-sm">{t("common.loading")}</div>
        ) : error ? (
          <div className="px-3 py-3 text-sm">{error}</div>
        ) : sorted.length === 0 ? (
          <div className="px-3 py-3 text-sm text-black/60">{t("indicators.empty")}</div>
        ) : (
          <>
            {activeTab === "ema" && <EmaTable data={sorted} />}
            {activeTab === "rsi" && <RsiTable data={sorted} />}
            {activeTab === "macd" && <MacdTable data={sorted} />}
            {activeTab === "bb" && <BbTable data={sorted} />}
          </>
        )}
      </div>
    </main>
  );
}

/* ─── EMA Table ──────────────────────────────────────────── */
function EmaTable({ data }: { data: Indicator[] }) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="border-b border-black/10">
        <tr className="text-left">
          <th className="px-2 py-3 font-bold whitespace-nowrap">Coin</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Price</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">EMA 20</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">EMA 50</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">EMA 200</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {data.map((row) => {
          const coin = COIN_NAMES[row.symbol];
          return (
            <tr key={row.symbol}>
              <td className="px-2 py-2 whitespace-nowrap">
                <div className="font-medium">{coin?.name ?? row.symbol}</div>
                <div className="text-xs text-black/50">{coin?.symbol}</div>
              </td>
              <td className="px-2 py-2 font-medium whitespace-nowrap">{formatNum(row.price)}</td>
              <td className="px-2 py-2 whitespace-nowrap">
                {row.ema.ema20 ? (
                  <div>
                    <div className="font-medium">{formatNum(row.ema.ema20.value)}</div>
                    <TrendBadge trend={row.ema.ema20.trend} />
                  </div>
                ) : (
                  <span className="text-black/30">—</span>
                )}
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                {row.ema.ema50 ? (
                  <div>
                    <div className="font-medium">{formatNum(row.ema.ema50.value)}</div>
                    <TrendBadge trend={row.ema.ema50.trend} />
                  </div>
                ) : (
                  <span className="text-black/30">—</span>
                )}
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                {row.ema.ema200 ? (
                  <div>
                    <div className="font-medium">{formatNum(row.ema.ema200.value)}</div>
                    <TrendBadge trend={row.ema.ema200.trend} />
                  </div>
                ) : (
                  <span className="text-black/30">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

/* ─── RSI Table ──────────────────────────────────────────── */
function RsiTable({ data }: { data: Indicator[] }) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="border-b border-black/10">
        <tr className="text-left">
          <th className="px-2 py-3 font-bold whitespace-nowrap">Coin</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Price</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">RSI (14)</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Condition</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {data.map((row) => {
          const coin = COIN_NAMES[row.symbol];
          return (
            <tr key={row.symbol}>
              <td className="px-2 py-2 whitespace-nowrap">
                <div className="font-medium">{coin?.name ?? row.symbol}</div>
                <div className="text-xs text-black/50">{coin?.symbol}</div>
              </td>
              <td className="px-2 py-2 font-medium whitespace-nowrap">{formatNum(row.price)}</td>
              <td className="px-2 py-2 font-medium whitespace-nowrap">
                {row.rsi ? formatNum(row.rsi.value) : <span className="text-black/30">—</span>}
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                {row.rsi ? (
                  <RsiBadge condition={row.rsi.condition} />
                ) : (
                  <span className="text-black/30">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

/* ─── MACD Table ─────────────────────────────────────────── */
function MacdTable({ data }: { data: Indicator[] }) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="border-b border-black/10">
        <tr className="text-left">
          <th className="px-2 py-3 font-bold whitespace-nowrap">Coin</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">MACD</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Signal</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Histogram</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Momentum</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {data.map((row) => {
          const coin = COIN_NAMES[row.symbol];
          return (
            <tr key={row.symbol}>
              <td className="px-2 py-2 whitespace-nowrap">
                <div className="font-medium">{coin?.name ?? row.symbol}</div>
                <div className="text-xs text-black/50">{coin?.symbol}</div>
              </td>
              {row.macd ? (
                <>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">
                    {formatNum(row.macd.macd, 4)}
                  </td>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">
                    {formatNum(row.macd.signal, 4)}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium whitespace-nowrap ${
                      row.macd.histogram >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {row.macd.histogram >= 0 ? "+" : ""}
                    {formatNum(row.macd.histogram, 4)}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <TrendBadge trend={row.macd.momentum} />
                  </td>
                </>
              ) : (
                <>
                  <td className="px-2 py-2 text-black/30">—</td>
                  <td className="px-2 py-2 text-black/30">—</td>
                  <td className="px-2 py-2 text-black/30">—</td>
                  <td className="px-2 py-2 text-black/30">—</td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

/* ─── Bollinger Bands Table ──────────────────────────────── */
function BbTable({ data }: { data: Indicator[] }) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="border-b border-black/10">
        <tr className="text-left">
          <th className="px-2 py-3 font-bold whitespace-nowrap">Coin</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Price</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Upper</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Middle</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Lower</th>
          <th className="px-2 py-3 font-bold whitespace-nowrap">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {data.map((row) => {
          const coin = COIN_NAMES[row.symbol];
          return (
            <tr key={row.symbol}>
              <td className="px-2 py-2 whitespace-nowrap">
                <div className="font-medium">{coin?.name ?? row.symbol}</div>
                <div className="text-xs text-black/50">{coin?.symbol}</div>
              </td>
              <td className="px-2 py-2 font-medium whitespace-nowrap">{formatNum(row.price)}</td>
              {row.bollingerBands ? (
                <>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">
                    {formatNum(row.bollingerBands.upper)}
                  </td>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">
                    {formatNum(row.bollingerBands.middle)}
                  </td>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">
                    {formatNum(row.bollingerBands.lower)}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <BbBadge status={row.bollingerBands.status} />
                  </td>
                </>
              ) : (
                <>
                  <td className="px-2 py-2 text-black/30">—</td>
                  <td className="px-2 py-2 text-black/30">—</td>
                  <td className="px-2 py-2 text-black/30">—</td>
                  <td className="px-2 py-2 text-black/30">—</td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
