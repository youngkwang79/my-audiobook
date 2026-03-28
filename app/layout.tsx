import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/app/providers/AuthProvider";
import AuthSessionGuard from "@/app/components/AuthSessionGuard";
import VisitorStats from "@/app/components/VisitorStats";
import LayoutFooter from "@/app/components/LayoutFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "무림북",
  description: "창작 무협 소설과 오디오 스토리를 감상하는 무협 오디오북 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <AuthSessionGuard />
          {children}
          <VisitorStats />
          <LayoutFooter />
        </AuthProvider>
      </body>
    </html>
  );
}