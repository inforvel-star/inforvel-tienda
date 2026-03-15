/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTA: Para hosting compartido sin soporte Node.js, se necesita exportación estática
  // Sin embargo, las páginas dinámicas requieren un servidor Node.js
  // Opciones: 1) Usar Netlify/Vercel (gratis, recomendado)
  //          2) VPS con Node.js
  //          3) Convertir todo a estático (perder funcionalidad dinámica)
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  trailingSlash: true,
};

module.exports = nextConfig;
