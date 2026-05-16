import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "../src/components/Navbar";
import Footer from "../src/components/Footer";
import I18nProvider from "../src/i18n";
import { AuthProvider } from "../src/components/AuthProvider";
import { LayoutWrapper } from "../src/components/LayoutWrapper";
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
        <AuthProvider>
          <I18nProvider>
            <Navbar />
            <LayoutWrapper>{children}</LayoutWrapper>
            <Footer />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
