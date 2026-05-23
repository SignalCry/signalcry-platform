"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/src/i18n";
import { API_BASE } from "@/src/constants/app";

// ─── Types ────────────────────────────────────────────────────────────────────

type NewsItem = {
  id: string;
  title: string;
  image: string | null;
  excerpt: string;
  content: string;
  source?: string;
  publishedAt?: string;
  url?: string;
  topics?: string[];
};

type NewsResponse = {
  articles: NewsItem[];
  total: number;
  nextCursor: string | null;
};

type Filters = { topic: string; source: string; date: string };
type DropdownKey = "topic" | "source" | "date" | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPICS = ["Bitcoin", "Ethereum", "DeFi", "NFT", "Regulation", "Altcoins"];
const SOURCES = [
  "CoinDesk", "CoinTelegraph", "Decrypt",
  "Bitcoin Magazine", "Blockworks", "NewsBTC",
  "AMBCrypto", "CryptoPotato",
];
const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const LIMIT = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++)
    pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

// Monday-first: 0 = Mon … 6 = Sun
function getFirstDayOfMonth(y: number, m: number) {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  availableDates,
  value,
  month,
  onMonthChange,
  onSelect,
  minMonth,
}: {
  availableDates: Set<string>;
  value: string;
  month: Date;
  onMonthChange: (d: Date) => void;
  onSelect: (d: string) => void;
  minMonth: Date;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = getDaysInMonth(y, m);
  const firstDay = getFirstDayOfMonth(y, m);
  const today = toDateStr(new Date());
  const nowY = new Date().getFullYear();
  const nowM = new Date().getMonth();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevDisabled = y === minMonth.getFullYear() && m <= minMonth.getMonth();
  const nextDisabled = y > nowY || (y === nowY && m >= nowM);
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="w-64 rounded border border-black/15 bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => onMonthChange(new Date(y, m - 1, 1))}
          disabled={prevDisabled}
          className="flex h-6 w-6 items-center justify-center rounded text-sm hover:bg-black/5 disabled:opacity-20"
        >
          ‹
        </button>
        <span className="text-xs font-medium">{monthLabel}</span>
        <button
          onClick={() => onMonthChange(new Date(y, m + 1, 1))}
          disabled={nextDisabled}
          className="flex h-6 w-6 items-center justify-center rounded text-sm hover:bg-black/5 disabled:opacity-20"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center">
        {DAY_LABELS.map((d) => (
          <span key={d} className="text-[10px] font-medium text-black/30">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {cells.map((day, i) => {
          if (day === null) return <span key={`e-${i}`} />;

          const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasNews = availableDates.has(dateStr);
          const isFuture = dateStr > today;
          const isSelected = dateStr === value;
          const isToday = dateStr === today;

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && hasNews && onSelect(dateStr)}
              disabled={isFuture || !hasNews}
              className={[
                "relative flex h-7 w-full items-center justify-center rounded text-xs transition-colors",
                isSelected ? "bg-black text-white" : "",
                !isSelected && isToday ? "font-semibold underline underline-offset-2" : "",
                hasNews && !isFuture && !isSelected ? "hover:bg-black/10 text-black" : "",
                (!hasNews || isFuture) && !isSelected ? "cursor-default text-black/20" : "",
              ].filter(Boolean).join(" ")}
            >
              {day}
              {hasNews && !isFuture && (
                <span className="absolute bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-black/40" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const { t } = useTranslation();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({ topic: "", source: "", date: "" });
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const filterBarRef = useRef<HTMLDivElement>(null);

  const minMonth = new Date();
  minMonth.setMonth(minMonth.getMonth() - 3);

  // Fetch available dates once
  useEffect(() => {
    fetch(`${API_BASE}/news/dates`)
      .then((r) => r.json())
      .then((data: { dates: string[] }) => setAvailableDates(new Set(data.dates ?? [])))
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Fetch news on filter/page change
  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({ limit: String(LIMIT) });
        if (cursor)         params.set("cursor", cursor);
        if (filters.topic)  params.set("topic",  filters.topic);
        if (filters.source) params.set("source", filters.source);
        if (filters.date)   params.set("date",   filters.date);

        const response = await fetch(
          `${API_BASE}/news?${params.toString()}`,
          { method: "GET", headers: { Accept: "application/json" } }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as NewsResponse;
        if (isMounted) {
          setNews(Array.isArray(data.articles) ? data.articles : []);
          setTotal(data.total ?? 0);
          setNextCursor(data.nextCursor ?? null);
        }
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e.message : t("errors.failedLoadNews"));
          setNews([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadNews();
    return () => { isMounted = false; };
  }, [cursor, filters, t]);

  function applyFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCursor("");
    setCursorStack([]);
    setOpenDropdown(null);
  }

  function clearFilters() {
    setFilters({ topic: "", source: "", date: "" });
    setCursor("");
    setCursorStack([]);
  }

  const hasFilters = !!(filters.topic || filters.source || filters.date);

  return (
    <main className="text-black">

      {/* ── Filter bar ── */}
      <div
        ref={filterBarRef}
        className="sticky top-0 z-10 border-b border-black/10 bg-white px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-2">

          {/* Topic dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "topic" ? null : "topic")}
              className={`flex h-8 items-center gap-1.5 rounded border px-3 text-xs font-medium transition-colors ${
                filters.topic
                  ? "border-black bg-black text-white"
                  : "border-black/15 text-black/60 hover:border-black/30 hover:text-black"
              }`}
            >
              {filters.topic || "All Topics"}
              <span className="text-[10px] opacity-50">▾</span>
            </button>
            {openDropdown === "topic" && (
              <div className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded border border-black/10 bg-white shadow-lg">
                <button
                  onClick={() => applyFilter("topic", "")}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-black/5 ${!filters.topic ? "font-semibold" : ""}`}
                >
                  All Topics
                </button>
                {TOPICS.map((tp) => (
                  <button
                    key={tp}
                    onClick={() => applyFilter("topic", tp)}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-black/5 ${filters.topic === tp ? "font-semibold" : ""}`}
                  >
                    {tp}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Source dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "source" ? null : "source")}
              className={`flex h-8 items-center gap-1.5 rounded border px-3 text-xs font-medium transition-colors ${
                filters.source
                  ? "border-black bg-black text-white"
                  : "border-black/15 text-black/60 hover:border-black/30 hover:text-black"
              }`}
            >
              {filters.source || "All Sources"}
              <span className="text-[10px] opacity-50">▾</span>
            </button>
            {openDropdown === "source" && (
              <div className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded border border-black/10 bg-white shadow-lg">
                <button
                  onClick={() => applyFilter("source", "")}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-black/5 ${!filters.source ? "font-semibold" : ""}`}
                >
                  All Sources
                </button>
                {SOURCES.map((s) => (
                  <button
                    key={s}
                    onClick={() => applyFilter("source", s)}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-black/5 ${filters.source === s ? "font-semibold" : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date picker */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "date" ? null : "date")}
              className={`flex h-8 items-center gap-1.5 rounded border px-3 text-xs font-medium transition-colors ${
                filters.date
                  ? "border-black bg-black text-white"
                  : "border-black/15 text-black/60 hover:border-black/30 hover:text-black"
              }`}
            >
              {filters.date || "Pick a date"}
              <span className="text-[10px]">📅</span>
            </button>
            {openDropdown === "date" && (
              <div className="absolute left-0 top-full z-20 mt-1">
                <MiniCalendar
                  availableDates={availableDates}
                  value={filters.date}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  minMonth={minMonth}
                  onSelect={(d) => applyFilter("date", filters.date === d ? "" : d)}
                />
              </div>
            )}
          </div>

          {/* Article count + clear */}
          <div className="ml-auto flex items-center gap-2">
            {!isLoading && (
              <span className="text-xs text-black/30">
                {total} {total === 1 ? "article" : "articles"}
              </span>
            )}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex h-8 items-center gap-1 rounded border border-black/15 px-3 text-xs text-black/50 hover:border-black/30 hover:text-black"
              >
                × Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="px-4 py-8 text-sm text-black/40">{t("common.loading")}</div>
      ) : error ? (
        <div className="px-4 py-8 text-sm text-red-500">{error}</div>
      ) : news.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-black/40">
          No articles found for the selected filters.
        </div>
      ) : (
        <>
          <div className="divide-y divide-black/10">
            {news.map((item) => (
              <article key={item.id}>
                <Link
                  href={`/news/${item.id}`}
                  className="flex gap-4 px-4 py-4 transition-colors hover:bg-black/5"
                >
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={160}
                      height={100}
                      className="h-18 w-28 shrink-0 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="mb-1 text-sm font-semibold leading-snug">
                      {item.title}
                    </h2>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {(item.source || item.publishedAt) && (
                        <span className="text-xs text-black/40">
                          {item.source}
                          {item.source && item.publishedAt ? " · " : ""}
                          {timeAgo(item.publishedAt)}
                        </span>
                      )}
                      {item.topics && item.topics.length > 0 && (
                        <div className="flex gap-1">
                          {item.topics.map((tp) => (
                            <span
                              key={tp}
                              className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-black/50"
                            >
                              {tp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-black/60 line-clamp-2">
                      {item.excerpt}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          {(cursorStack.length > 0 || nextCursor) && (
            <div className="flex items-center justify-center gap-2 border-t border-black/10 px-4 py-4">
              <button
                onClick={() => {
                  const stack = [...cursorStack];
                  const prev = stack.pop() ?? "";
                  setCursorStack(stack);
                  setCursor(prev);
                }}
                disabled={cursorStack.length === 0}
                className="flex h-8 items-center gap-1 rounded border border-black/15 px-3 text-xs font-medium transition-colors hover:border-black/30 disabled:pointer-events-none disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                onClick={() => {
                  if (!nextCursor) return;
                  setCursorStack((s) => [...s, cursor]);
                  setCursor(nextCursor);
                }}
                disabled={!nextCursor}
                className="flex h-8 items-center gap-1 rounded border border-black/15 px-3 text-xs font-medium transition-colors hover:border-black/30 disabled:pointer-events-none disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
