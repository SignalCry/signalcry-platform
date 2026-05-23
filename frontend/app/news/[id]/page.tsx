"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/src/i18n";
import { API_BASE } from "@/src/constants/app";

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

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NewsArticlePage() {
  const params = useParams<{ id: string }>();
  const articleId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!articleId) return;

    let isMounted = true;

    async function loadArticle() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE}/news/${articleId}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load article (HTTP ${response.status})`);
        }

        const data = (await response.json()) as NewsItem;
        if (isMounted) setArticle(data);
      } catch (err) {
        if (isMounted)
          setError(
            err instanceof Error ? err.message : t("errors.failedLoadArticle")
          );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadArticle();

    return () => {
      isMounted = false;
    };
  }, [articleId, t]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 text-black">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="min-h-screen p-6 text-black">
        <p>{error ?? t("news.notFound")}</p>
      </main>
    );
  }

  const paragraphs = article.content
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <main className="min-h-screen p-6 text-black">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/news"
          className="mb-6 inline-block text-sm text-black/50 hover:text-black"
        >
          &larr; {t("news.backToNews")}
        </Link>

        <h1 className="mb-3 text-2xl font-semibold leading-tight">
          {article.title}
        </h1>

        {(article.source || article.publishedAt) && (
          <p className="mb-6 text-sm text-black/40">
            {article.source}
            {article.source && article.publishedAt ? " · " : ""}
            {formatDate(article.publishedAt)}
          </p>
        )}

        <article className="space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-base leading-relaxed text-black/85">
              {p}
            </p>
          ))}
        </article>
      </div>
    </main>
  );
}
