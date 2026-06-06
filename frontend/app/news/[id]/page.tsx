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
  source?: string;
  publishedAt?: string;
  url?: string;
  topics?: string[];
  aiProcessed?: boolean;
  aiSummary?: string | null;
  aiSentiment?: "bullish" | "bearish" | "neutral" | null;
  aiImpactScore?: number | null;
  aiAssets?: string[];
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

const SENTIMENT_STYLES: Record<"bullish" | "bearish" | "neutral", string> = {
  bullish: "bg-green-50 text-green-700",
  bearish: "bg-red-50 text-red-700",
  neutral: "bg-black/5 text-black/60",
};

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

  const hasAnalysis = Boolean(article.aiProcessed && article.aiSummary);
  const sentiment = article.aiSentiment ?? "neutral";

  return (
    <main className="min-h-screen p-6 text-black">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/news"
          className="mb-6 inline-block text-base text-black/50 no-underline hover:underline hover:underline-offset-2 hover:text-black"
        >
          &larr; {t("news.backToNews")}
        </Link>

        {hasAnalysis && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {article.topics?.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-black/5 px-2.5 py-0.5 text-base text-black/60"
              >
                {topic}
              </span>
            ))}

            <span
              className={`rounded-full px-2.5 py-0.5 text-base font-medium ${SENTIMENT_STYLES[sentiment]}`}
            >
              {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
            </span>

            {typeof article.aiImpactScore === "number" && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-base font-medium text-amber-700">
                Impact {article.aiImpactScore}/100
              </span>
            )}
          </div>
        )}

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

        {hasAnalysis && (
          <div className="mb-6 rounded-xl border border-black/10 bg-black/3 p-5">
            <div className="mb-3 flex items-center gap-1.5 text-base font-medium">
              <span aria-hidden>⚡</span>
              <span>Signal X AI Analysis</span>
            </div>

            <p className="text-base leading-relaxed text-black/80">
              {article.aiSummary}
            </p>

            {article.aiAssets && article.aiAssets.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-base text-black/50">Affected assets:</span>
                {article.aiAssets.map((asset) => (
                  <span
                    key={asset}
                    className="rounded border border-black/15 px-2 py-0.5 text-base"
                  >
                    {asset}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {article.excerpt && (
          <p className="mb-6 text-base leading-relaxed text-black/70">
            {article.excerpt}
          </p>
        )}

        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md border border-black/15 px-4 py-2 text-base hover:bg-black/5"
          >
            Read full article at {article.source} &rarr;
          </a>
        )}
      </div>
    </main>
  );
}
