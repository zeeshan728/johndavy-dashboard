import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/brief",
        destination: "/",
      },
      {
        source: '/connections',
        destination: '/',
      },
      {
        source: '/system-health',
        destination: '/',
      },
      {
        source: "/priorities",
        destination: "/",
      },
      {
        source: "/approval-outbox",
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
      {
        source: "/logistics",
        destination: "/",
      },
      {
        source: "/legal",
        destination: "/",
      },
      {
        source: "/finance",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;

