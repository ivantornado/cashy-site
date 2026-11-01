import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// Empty locally. The GitHub Pages build sets it, e.g. PAGES_BASE_PATH=/cashy-site
const basePath = process.env.PAGES_BASE_PATH ?? "";

// Lets a phone on the same Wi-Fi open the dev server.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net?.family === "IPv4" && !net.internal)
  .map((net) => net!.address);

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  allowedDevOrigins: lanAddresses,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
