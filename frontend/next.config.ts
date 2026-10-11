import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, ".."),
  async rewrites() {
    const apiOrigin = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000";
    return [
      { source: "/favicon.ico", destination: "/icon.svg" },
      { source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
