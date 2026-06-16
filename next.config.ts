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
      '무명지협/**/*',
      '_temp_plan_*/**/*',
      'ffmpeg.exe',
      '*.exe',
      '*.py',
      '*.mp3',
      '*.zip',
      '*.patch',
      '*.log',
      '*.txt',
      '__pycache__/**/*',
      'scripts/**/*',
      'node_modules/{@next/swc-win32-x64-msvc}/**/*',
      'node_modules/{@next/swc-darwin-arm64}/**/*',
      'node_modules/{@next/swc-linux-x64-gnu}/**/*',
    ],
  },
};

export default nextConfig;
