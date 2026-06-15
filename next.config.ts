import type { NextConfig } from "next";

const nextConfig: any = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/thumbnails/:path*",
          destination: "/api/thumbnails/:path*",
        },
      ],
    };
  },
  outputFileTracingExcludes: {
    '*': [
      '무림북_*/**/*',
      '무명 무협소설/**/*',
      '파이선 소설 이어쓰기/**/*',
      'public/images/**/*',
      '*.mp3',
      '*.zip'
    ],
  },
};

export default nextConfig;
