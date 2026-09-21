/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,

  async redirects() {
    return [
      {
        source: '/mantenimiento-informatico-empresas-cordoba',
        destination: '/servicios-pymes-empresas-cordoba',
        permanent: true,
      },
      {
        source: '/servicio-tecnico-empresas-cordoba',
        destination: '/servicios-pymes-empresas-cordoba',
        permanent: true,
      },
      // Blog: posts renovados por contenido de poco valor (revisión AdSense, sep 2026).
      // Los slugs antiguos redirigen al artículo nuevo que ocupa su lugar.
      {
        source: '/blog/prueba-simple',
        destination: '/blog/inteligencia-artificial-en-2026-oportunidades-riesgos-y-futuro',
        permanent: true,
      },
      {
        source: '/blog/smartphones-en-2025-la-revolucion-silenciosa-que-redefine-nuestra-realidad',
        destination: '/blog/como-elegir-smartphone-reacondicionado-guia-completa',
        permanent: true,
      },
      {
        source: '/blog/redes-sociales-y-tendencias-digitales-la-revolucion-silenciosa-que-transforma-nuestro-mundo-en-2025',
        destination: '/blog/windows-10-sin-soporte-que-hacer-con-tu-pc-antiguo',
        permanent: true,
      },
      {
        source: '/blog/el-futuro-ya-esta-aqui-los-gadgets-y-el-hardware-que-definen-el-2026',
        destination: '/blog/ssd-vs-hdd-cuando-actualizar-disco-ordenador',
        permanent: true,
      },
      {
        source: '/blog/software-y-aplicaciones-web-el-futuro-es-ahora-y-ya-esta-transformando-tu-dia-a-dia',
        destination: '/blog/como-saber-si-tu-ordenador-tiene-virus-y-como-solucionarlo',
        permanent: true,
      },
      {
        source: '/blog/software-y-aplicaciones-web-en-2025-la-revolucion-silenciosa-que-transforma-nuestro-dia-a-dia',
        destination: '/blog/como-saber-si-tu-ordenador-tiene-virus-y-como-solucionarlo',
        permanent: true,
      },
      {
        source: '/blog/el-futuro-es-electrico-coches-y-movilidad-tecnologica-revolucionan-2025',
        destination: '/blog/portatil-lento-causas-comunes-y-como-solucionarlas',
        permanent: true,
      },
      {
        source: '/blog/coches-electricos-2025-la-revolucion-tecnologica-que-ya-esta-transformando-nuestra-movilidad',
        destination: '/blog/portatil-lento-causas-comunes-y-como-solucionarlas',
        permanent: true,
      },
      {
        source: '/blog/noticias-tecnolgicas-madrid-tiene-una-red-de-cercanas-saturada-solucin-trenes-gigantes-de',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blog/noticias-tecnolgicas-la-ue-vuelve-a-apretarle-las-tuercas-a-google-quiere-que-gemini-deje',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blog/noticias-tecnolgicas-china-ha-adelantado-a-la-nasa-con-uno-de-sus-proyectos-ms-ambiciosos',
        destination: '/blog',
        permanent: true,
      },
    ];
  },

  // ✅ Headers de seguridad HTTP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://admin.inforvel.online; object-src 'none'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network https://pagead2.googlesyndication.com https://www.googletagmanager.com https://tracker.metricool.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://admin.inforvel.online https://api.stripe.com https://r.stripe.com https://m.stripe.network https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://tracker.metricool.com https://*.metricool.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://pagead2.googlesyndication.com; upgrade-insecure-requests",
          },
          // Evita que la página sea embebida en iframes (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Evita que el navegador detecte el tipo MIME incorrectamente
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Controla qué información de referencia se envía
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desactiva funciones del navegador no usadas
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Habilita el filtro XSS del navegador
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
