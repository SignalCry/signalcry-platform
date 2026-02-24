"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "../i18n";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <header className="w-full bg-black">
      <div className="mx-auto flex w-4/5 items-center justify-between py-3">
        <Link href="/" className="inline-flex items-center">
          <span className="rounded-l border border-white/20 bg-black px-2 py-1 text-sm font-semibold text-white">
            Signal
          </span>
          <span className="rounded-r border border-white/20 border-l-0 bg-white px-2 py-1 text-sm font-semibold text-black">
            Cry
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-white md:flex">
          <Link href="/" className="hover:underline underline-offset-4">
            {t("navbar.home")}
          </Link>
          <Link href="/news" className="hover:underline underline-offset-4">
            {t("navbar.news")}
          </Link>
          <Link href="/indicators" className="hover:underline underline-offset-4">
            {t("navbar.indicators")}
          </Link>
          <Link href="/market" className="hover:underline underline-offset-4">
            {t("navbar.market")}
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded p-2 text-white md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {isOpen ? (
        <nav className="md:hidden">
          <div className="mx-auto w-4/5 border-t border-white/15 py-3 text-sm font-medium text-white">
            <div className="flex flex-col gap-3">
              <Link href="/" onClick={() => setIsOpen(false)}>
                {t("navbar.home")}
              </Link>
              <Link href="/news" onClick={() => setIsOpen(false)}>
                {t("navbar.news")}
              </Link>
              <Link href="/indicators" onClick={() => setIsOpen(false)}>
                {t("navbar.indicators")}
              </Link>
              <Link href="/market" onClick={() => setIsOpen(false)}>
                {t("navbar.market")}
              </Link>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
