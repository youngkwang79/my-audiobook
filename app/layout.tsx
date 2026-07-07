import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

import { AuthProvider } from "@/app/providers/AuthProvider";
import AuthSessionGuard from "@/app/components/AuthSessionGuard";
import LayoutWrapper from "@/app/components/LayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "무림북 — 창작 무협 웹소설 오디오북 플랫폼",
  description: "무림북에서 고품격 창작 무협 웹소설과 생생한 오디오 스토리를 자막과 함께 감상하세요. 생활 법률, 재테크 등 도움되는 유용한 지식 칼럼도 연재 중입니다.",
  keywords: ["무림북", "murimbook", "무협웹소설", "무협소설", "창작무협소설", "오디오북", "도움되는글"],
  manifest: "/manifest.json",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "무림북",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "무림북 — 창작 무협 웹소설 오디오북 플랫폼",
    description: "무림북에서 고품격 창작 무협 웹소설과 생생한 오디오 스토리를 자막과 함께 감상하세요. 생활 법률, 재테크 등 도움되는 유용한 지식 칼럼도 연재 중입니다.",
    url: "https://www.murimbook.com",
    siteName: "무림북",
    locale: "ko_KR",
    type: "website",
  },
};



export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-6922397955333834" />
        <meta name="msvalidate.01" content="C367B433A4F302DDBA7950F6EF881044" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;900&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            try {
              const theme = localStorage.getItem('theme') || 'dark';
              document.documentElement.className = theme;
            } catch (e) {}
          })();
        `}} />
      </head>
      <body className="antialiased font-sans">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-WKLB4BKH17"
          strategy="afterInteractive"
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6922397955333834"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-WKLB4BKH17');
          `}
        </Script>
        <AuthProvider>
          <AuthSessionGuard />
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}