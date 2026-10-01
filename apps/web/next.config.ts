import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The invoice import sends XML files and ZIP archives up to 20 MB each (limit checked again in
      // the action and in the API); the default is 1 MB. Room left for the multipart overhead.
      bodySizeLimit: "21mb",
    },
  },
  // Security headers: no framing (clickjacking), no MIME sniffing, no referrer to other sites.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
