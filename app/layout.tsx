import type { Metadata } from "next";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
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

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "My Audiobook",
  description: "Audio story app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body
  className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} antialiased`}
>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
