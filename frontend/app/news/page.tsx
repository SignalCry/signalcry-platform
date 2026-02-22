"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/src/i18n";

type NewsItem = {
  id: string;
  title: string;
  image: string | null;
  excerpt: string;
  content: string;
  source?: string;
  publishedAt?: string;
  url?: string;
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("http://localhost:4000/api/news", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed to load news (HTTP ${response.status})`);
        }

        const data = (await response.json()) as NewsItem[];
        if (isMounted) setNews(Array.isArray(data) ? data : []);
      } catch (e) {
        if (isMounted) {
          setError(
            e instanceof Error ? e.message : t("errors.failedLoadNews")
          );
          setNews([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadNews();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="text-black">
      <div className="px-3 py-4">
        <h1 className="text-lg font-semibold">{t("news.allNews")}</h1>
      </div>

      {isLoading ? (
        <div className="px-3 pb-4 text-sm">{t("common.loading")}</div>
      ) : error ? (
        <div className="px-3 pb-4 text-sm">{error}</div>
      ) : (
        <div className="space-y-0">
          {news.map((item) => (
            <article
              key={item.id}
              className="border-b border-black/10 px-3 py-4"
            >
              <Link
                href={`/news/${item.id}`}
                className="flex gap-4 transition-colors hover:text-black"
              >
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={160}
                    height={120}
                    className="h-24 w-40 shrink-0 rounded object-cover"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="mb-1 text-sm font-semibold leading-snug">
                    {item.title}
                  </h2>
                  {(item.source || item.publishedAt) && (
                    <p className="mb-1 text-xs text-black/50">
                      {item.source}
                      {item.source && item.publishedAt ? " · " : ""}
                      {timeAgo(item.publishedAt)}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed text-black/70 line-clamp-2">
                    {item.excerpt}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
