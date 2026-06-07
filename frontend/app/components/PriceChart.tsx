"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from "lightweight-charts";
import { API_BASE } from "@/src/constants/app";

export type ChartTimeframe = "1D" | "1W" | "1M";

const TIMEFRAMES: ChartTimeframe[] = ["1D", "1W", "1M"];

const TIMEFRAME_TO_INTERVAL: Record<ChartTimeframe, string> = {
  "1D": "1h",
  "1W": "4h",
  "1M": "1d",
};

type KlineCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type KlinesResponse = {
  symbol: string;
  interval: string;
  candles: KlineCandle[];
};

type PriceChartProps = {
  symbolId: string;
  interval?: ChartTimeframe;
};

const CHART_FONT = "var(--font-ibm-plex-sans), 'IBM Plex Sans', sans-serif";

function toChartData(candles: KlineCandle[]): CandlestickData<UTCTimestamp>[] {
  return candles.map((c) => ({
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export default function PriceChart({
  symbolId,
  interval: initialInterval = "1D",
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [timeframe, setTimeframe] = useState<ChartTimeframe>(initialInterval);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKlines = useCallback(async (tf: ChartTimeframe) => {
    const apiInterval = TIMEFRAME_TO_INTERVAL[tf];
    const res = await fetch(
      `${API_BASE}/market/${symbolId}/klines?interval=${apiInterval}&limit=200`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`Failed to load chart data (HTTP ${res.status})`);
    return (await res.json()) as KlinesResponse;
  }, [symbolId]);

  // Init chart once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#000000",
        fontFamily: CHART_FONT,
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "rgba(0, 0, 0, 0.1)" },
        horzLines: { color: "rgba(0, 0, 0, 0.1)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(0, 0, 0, 0.2)" },
        horzLine: { color: "rgba(0, 0, 0, 0.2)" },
      },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderUpColor: "#16a34a",
      borderDownColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Load data when symbol or timeframe changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchKlines(timeframe);
        if (cancelled) return;

        const series = seriesRef.current;
        const chart = chartRef.current;
        if (!series || !chart) return;

        series.setData(toChartData(data.candles));
        chart.timeScale().fitContent();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load chart");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [symbolId, timeframe, fetchKlines]);

  useEffect(() => {
    setTimeframe(initialInterval);
  }, [initialInterval]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-black/10 px-3 py-2">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setTimeframe(tf)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors sm:text-sm ${
              timeframe === tf
                ? "bg-black text-white"
                : "text-black/50 hover:text-black/80"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-black/60">
            Loading chart…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white px-4 text-center text-sm text-red-600">
            {error}
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-1 right-2 z-20 text-[10px] text-black/40 hover:text-black/60"
        >
          Charts by TradingView
        </a>
      </div>
    </div>
  );
}
