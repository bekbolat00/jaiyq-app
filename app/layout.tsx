import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomTabBar from "./components/BottomTabBar";
import AppShell from "./components/AppShell";
import TelegramAuth from "./components/TelegramAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ФК Жайык",
  description: "Официальное мобильное приложение футбольного клуба «Жайык»",
};

export const viewport: Viewport = {
  themeColor: "#020408",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-full text-foreground">
        <TelegramAuth />
        <AppShell>
          <div className="bg-depth-orbs" aria-hidden>
            <span className="bg-orb" />
            <span className="bg-orb" />
            <span className="bg-orb" />
          </div>
          <div className="relative z-10 mx-auto flex h-dvh min-h-0 w-full max-w-[480px] flex-col">
            <main className="safe-top safe-bottom min-h-0 flex-1 overflow-y-auto px-4 pb-24 hide-scrollbar">
              {children}
            </main>
            <BottomTabBar />
          </div>
        </AppShell>
      </body>
    </html>
  );
}
