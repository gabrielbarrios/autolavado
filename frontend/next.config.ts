import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // Permite cualquier imagen sin pasarla por el optimizador de Next.js.
    // En desarrollo evita el 400 del optimizer cuando carga desde un Strapi local.
    // Para producción, lo recomendable es usar remotePatterns con el host real.
    unoptimized: true,
  },
};

export default nextConfig;
