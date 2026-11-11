import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // driver database dijalankan di server (Node.js runtime)
  serverExternalPackages: ["pg"],
};

export default nextConfig;
