import type { NextConfig } from "next";

// Where the Go API runs. The site forwards /api and /uploads to it, so a single
// public address (for example one tunnel to port 3000) is enough for phones.
const backend = process.env.BACKEND_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  // Lets phones and tunnels open the dev server (add your own LAN IP if you use one).
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt", "*.ngrok-free.app", "*.ngrok.app"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;