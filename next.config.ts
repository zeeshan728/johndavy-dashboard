import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/brief",
        destination: "/",
      },
      {
        source: "/priorities",
        destination: "/",
      },
      {
        source: "/revenue",
        destination: "/",
      },
      {
        source: "/automation",
        destination: "/",
      },
      {
        source: "/team",
        destination: "/",
      },
      {
        source: "/flowly",
        destination: "/",
      },
      {
        source: "/projects",
        destination: "/",
      },
      {
        source: "/decisions",
        destination: "/",
      },
      {
        source: "/meetings",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;

