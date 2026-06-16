import type { NextConfig } from "next";

const excludes = [
  '무림북_*/**/*',
  '무명 무협소설/**/*',
  '파이선 소설 이어쓰기/**/*',
  '무명지협/**/*',
  '_temp_plan_*/**/*',
  'ffmpeg.exe',
  'scripts/ffmpeg.exe',
  '**/ffmpeg.exe',
  '*.exe',
  '**/*.exe',
  '*.py',
  '**/*.py',
  '*.mp3',
  '**/*.mp3',
  '*.zip',
  '**/*.zip',
  '*.patch',
  '**/*.patch',
  '*.log',
  '**/*.log',
  '*.txt',
  '**/*.txt',
  '__pycache__/**/*',
  'node_modules/{@next/swc-win32-x64-msvc}/**/*',
  'node_modules/{@next/swc-darwin-arm64}/**/*',
  'node_modules/{@next/swc-linux-x64-gnu}/**/*',
];

const nextConfig: any = {
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
    '*': excludes,
    '**': excludes,
    '**/*': excludes,
    '/**/*': excludes,
    '/api/**/*': excludes,
    '/api/admin/automation/approve-plan': excludes,
    '/api/admin/automation/run': excludes,
  },
};

export default nextConfig;
