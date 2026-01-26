"use client";

import { useTranslation } from "../i18n";

export default function Footer() {
  const { t, lang, setLang } = useTranslation();

  return (
    <footer className="w-full bg-gray-100 py-4 text-black">
      <div className="mx-auto w-4/5 flex items-center justify-between text-sm">
        <div>{t("footer.copy")}</div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">{t("footer.language")}</div>
          <button
            onClick={() => setLang("en")}
            className={`px-2 py-1 rounded ${lang === "en" ? "bg-black text-white" : "bg-white text-black"}`}
          >
            {t("footer.english")}
          </button>
          <button
            onClick={() => setLang("es")}
            className={`px-2 py-1 rounded ${lang === "es" ? "bg-black text-white" : "bg-white text-black"}`}
          >
            {t("footer.spanish")}
          </button>
        </div>
      </div>
    </footer>
  );
}
