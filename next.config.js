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
            value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://admin.inforvel.online; object-src 'none'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network https://pagead2.googlesyndication.com https://www.googletagmanager.com https://tracker.metricool.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://admin.inforvel.online https://api.stripe.com https://r.stripe.com https://m.stripe.network https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://tracker.metricool.com https://*.metricool.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://pagead2.googlesyndication.com; upgrade-insecure-requests",
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
