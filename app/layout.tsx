import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/app/providers/AuthProvider";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {children}

      <footer style={{padding:"20px", textAlign:"center"}}>
        <a href="/privacy">개인정보처리방침</a> |
        <a href="/terms">이용약관</a> |
        <a href="/contact">문의</a> |
        <a href="/about">사이트소개</a>
      </footer>

        </AuthProvider>
      </body>
    </html>
  );
}
