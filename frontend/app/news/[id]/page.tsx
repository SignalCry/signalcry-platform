"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/src/i18n";

type NewsItem = {
  id: string;
  title: string;
  image: string;
  excerpt: string;
  content: string;
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

        const response = await fetch("http://localhost:4000/api/news", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed to load article (HTTP ${response.status})`);
        }

        const data = (await response.json()) as NewsItem[];
        const found = data.find((item) => item.id === articleId) ?? null;
        if (isMounted) setArticle(found);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : t("errors.failedLoadArticle"));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadArticle();

    return () => {
      isMounted = false;
    };
  }, [articleId]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 text-black">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="min-h-screen p-4 text-black">
        <p>{error ?? t("news.notFound")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-4 p-6 text-black">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-semibold leading-tight">{article.title}</h1>
      </header>
      <section className="relative w-full">
        <p className="text-lg leading-relaxed text-black filter blur-[3px] select-none">
          {article.content}
        </p>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-base font-medium">{t("news.unlockMessage")}</p>
          <p className="text-sm text-black/70">{t("news.price")}</p>
          <button className="pointer-events-auto mt-3 rounded border border-black bg-black px-4 py-1.5 text-sm font-medium text-white">
            {t("news.unlockButton")}
          </button>
        </div>
      </section>
    </main>
  );
}
