import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bullmq", "ioredis", "music-metadata"],
  async rewrites() {
    return [{ source: "/enterprise", destination: "/index.html" }];
  },
};

export default nextConfig;
