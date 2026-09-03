import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera uma pasta .next/standalone com um server.js autocontido — a
  // imagem Docker final não precisa copiar node_modules inteiro.
  output: "standalone",
};

export default nextConfig;
