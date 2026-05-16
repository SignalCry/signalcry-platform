"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "../i18n";
import { APP_NAME } from "../constants/app";
import Logo from "./Logo";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push("/");
  };

  return (
    <header className="w-full bg-black">
      <div className="mx-auto flex w-4/5 items-center justify-between py-3">
        <Link href="/" aria-label={APP_NAME} className="inline-flex items-center">
          <Logo />
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

          {!user ? (
            <Link
              href="/auth"
              className="ml-4 rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-slate-100 transition"
            >
              Login
            </Link>
          ) : (
            <div className="relative ml-4">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-white text-sm font-semibold hover:shadow-lg transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  {user.username[0].toUpperCase()}
                </div>
                <span>{user.username}</span>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-black border border-white/20 rounded-lg shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-white/20">
                    <p className="text-xs text-gray-400">Logged in as</p>
                    <p className="text-white font-semibold truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-white/10 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
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
              {!user ? (
                <Link
                  href="/auth"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold text-center"
                >
                  Login
                </Link>
              ) : (
                <div className="border-t border-white/15 pt-3 mt-3">
                  <p className="text-xs text-gray-400 mb-2">Logged in as</p>
                  <p className="text-white font-semibold mb-3">{user.email}</p>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-red-400 hover:bg-white/10 rounded transition-colors text-left"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
