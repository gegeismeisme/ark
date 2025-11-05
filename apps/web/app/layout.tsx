import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { WebI18nProvider } from "./web-i18n-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return {
    title: t("app.meta.title"),
    description: t("app.meta.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WebI18nProvider locale={locale}>{children}</WebI18nProvider>
      </body>
    </html>
  );
}
