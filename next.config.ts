import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bcryptjs & postgres dijalankan di server (Node.js runtime)
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
