import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: {
    position: "bottom-left",
  },
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon.svg",
      },
    ];
  },
};

export default nextConfig;
