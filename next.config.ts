import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: `npm run build` writes plain HTML to out/
  output: "export",
};

export default nextConfig;
