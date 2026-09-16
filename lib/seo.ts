export const siteConfig = {
  name: 'Inforvel',
  domain: 'https://inforvel.online',
  title: 'Inforvel | Tienda online de informática en Córdoba',
  description:
    'Tienda online de informática en Córdoba especializada en venta de equipos informáticos, portátiles, smartphones, componentes, accesorios y reacondicionados con envío rápido.',
  phone: '+34 652 369 650',
  email: 'inforvel@inforvel.online',
  address: {
    street: 'C/ El Avellano, 2',
    postalCode: '14006',
    city: 'Córdoba',
    region: 'Córdoba',
    country: 'ES',
  },
};

export const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/search/?api=1&query=Inforvel+C%C3%B3rdoba';

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || siteConfig.domain;
}

export function absoluteUrl(path: string = '/') {
  const base = getBaseUrl().replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
