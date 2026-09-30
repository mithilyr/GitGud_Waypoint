import type { NextConfig } from "next";

const apiInternal = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Standalone output keeps the Docker image small.
  output: "standalone",
  // The browser talks to /api/*; Next forwards it to the FastAPI service (no CORS, no baked-in API URL).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternal}/:path*` }];
  },
};

export default nextConfig;
