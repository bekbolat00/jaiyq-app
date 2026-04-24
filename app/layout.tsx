import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomTabBar from "./components/BottomTabBar";

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
  themeColor: "#0b132b",
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
      <body className="min-h-full text-foreground">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
          <main className="safe-top safe-bottom flex-1 px-4">{children}</main>
          <BottomTabBar />
        </div>
      </body>
    </html>
  );
}
