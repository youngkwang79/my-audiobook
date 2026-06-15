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
};

export default nextConfig;
