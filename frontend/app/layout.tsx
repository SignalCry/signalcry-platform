import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "../src/components/Navbar";
import Footer from "../src/components/Footer";
import I18nProvider from "../src/i18n";
import { APP_NAME } from "../src/constants/app";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Real-time crypto intelligence for traders. Track live crypto prices, news, technical indicators, and X posts that may move the market.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexSans.variable} antialiased`}>
        <I18nProvider>
          <Navbar />
          <div className="mx-auto my-5 w-[90%]">{children}</div>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
