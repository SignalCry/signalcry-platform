"use client";

import React, { memo, useEffect, useRef } from "react";

type Props = {
  symbol: string; // e.g. "BINANCE:BTCUSDT"
  theme?: "light" | "dark";
};

function TradingViewWidget({ symbol, theme = "light" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Important: clear container to avoid multiple widgets (React Strict Mode / route changes)
    container.replaceChildren();

    // Widget mount point
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "calc(100% - 32px)";
    widgetDiv.style.width = "100%";
    container.appendChild(widgetDiv);

    // TradingView script
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const config = {
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "1",
      symbol, // << dynamic
      theme,
      timezone: "Etc/UTC",
      backgroundColor: "#ffffff",
      gridColor: "rgba(46, 46, 46, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      autosize: true,
    };

    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);

    // Optional footer (you can remove if you don't want it)
    const footer = document.createElement("div");
    footer.className = "tradingview-widget-copyright";
    footer.innerHTML = `<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
      <span class="blue-text">Charts</span></a> by TradingView`;
    container.appendChild(footer);

    return () => {
      container.replaceChildren();
    };
  }, [symbol, theme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: "100%", width: "100%" }}
    />
  );
}

export default memo(TradingViewWidget);