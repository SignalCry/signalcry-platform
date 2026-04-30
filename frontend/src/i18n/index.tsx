"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "./en.json";
import es from "./es.json";

type Translations = Record<string, unknown>;

const TRANSLATIONS: Record<string, Translations> = {
  en,
  es,
};

type I18nContextValue = {
  lang: string;
  setLang: (l: string) => void;
  t: (key: string) => string;
  available: string[];
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    if (!(key in acc)) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("lang") || "en";
  });

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const available = useMemo(() => Object.keys(TRANSLATIONS), []);

  const t = (key: string) => {
    const trans = TRANSLATIONS[lang] || TRANSLATIONS["en"];
    const val = getByPath(trans, key);
    if (val == null) return key;
    return String(val);
  };

  const setLang = (l: string) => {
    if (!TRANSLATIONS[l]) return;
    setLangState(l);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, available }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}

export default I18nProvider;
