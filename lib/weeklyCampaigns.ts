export interface WeeklyBrandCampaign {
  brand: string;
  search: string;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  emptyMessage: string;
  banner?: string;
}

export interface WeeklyCampaignSet {
  laptops: WeeklyBrandCampaign;
  smartphones: WeeklyBrandCampaign;
}

export interface WeeklyCampaignConfig {
  laptops: WeeklyBrandCampaign[];
  smartphones: WeeklyBrandCampaign[];
}

const laptopCampaigns: WeeklyBrandCampaign[] = [
  {
    brand: 'HP',
    search: 'hp',
    label: 'HP Week',
    title: 'HP Week: aprovecha las mejores ofertas y renueva tu portátil',
    description: 'Selección semanal de portátiles HP para estudiar, trabajar o jugar.',
    ctaLabel: 'Ver portátiles HP',
    href: '/categoria/portatiles?search=hp',
    emptyMessage: 'Ahora mismo no hay portátiles HP destacados para mostrar.',
    banner: '/banners/brand-week/laptops/hp.webp',
  },
  {
    brand: 'Lenovo',
    search: 'lenovo',
    label: 'Lenovo Week',
    title: 'Lenovo Week: potencia y fiabilidad para tu día a día',
    description: 'Selección semanal de portátiles Lenovo con gran relación calidad-precio.',
    ctaLabel: 'Ver portátiles Lenovo',
    href: '/categoria/portatiles?search=lenovo',
    emptyMessage: 'Ahora mismo no hay portátiles Lenovo destacados para mostrar.',
    banner: '/banners/brand-week/laptops/lenovo.webp',
  },
  {
    brand: 'MSI',
    search: 'msi',
    label: 'MSI Week',
    title: 'MSI Week: portátiles de alto rendimiento para gaming y creación',
    description: 'Selección semanal de portátiles MSI para quienes buscan potencia.',
    ctaLabel: 'Ver portátiles MSI',
    href: '/categoria/portatiles?search=msi',
    emptyMessage: 'Ahora mismo no hay portátiles MSI destacados para mostrar.',
    banner: '/banners/brand-week/laptops/msi.webp',
  },
  {
    brand: 'Apple',
    search: 'apple macbook',
    label: 'Apple Week',
    title: 'Apple Week: descubre los MacBook más recomendados',
    description: 'Selección semanal de equipos Apple para productividad y creatividad.',
    ctaLabel: 'Ver MacBook',
    href: '/categoria/portatiles?search=macbook',
    emptyMessage: 'Ahora mismo no hay MacBook destacados para mostrar.',
    banner: '/banners/brand-week/laptops/apple.webp',
  },
];

const smartphoneCampaigns: WeeklyBrandCampaign[] = [
  {
    brand: 'Samsung',
    search: 'samsung galaxy',
    label: 'Samsung Week',
    title: 'Smartphones Samsung de la semana',
    description: 'Modelos Galaxy seleccionados para equilibrio entre rendimiento y batería.',
    ctaLabel: 'Ver Samsung',
    href: '/categoria/smartphones?search=samsung',
    emptyMessage: 'No hemos encontrado smartphones Samsung para mostrar ahora mismo.',
    banner: '/banners/brand-week/smartphones/samsung.webp',
  },
  {
    brand: 'Xiaomi',
    search: 'xiaomi redmi poco',
    label: 'Xiaomi Week',
    title: 'Smartphones Xiaomi de la semana',
    description: 'Modelos Xiaomi, Redmi y POCO con gran relación calidad-precio.',
    ctaLabel: 'Ver Xiaomi',
    href: '/categoria/smartphones?search=xiaomi',
    emptyMessage: 'No hemos encontrado smartphones Xiaomi para mostrar ahora mismo.',
    banner: '/banners/brand-week/smartphones/xiaomi.webp',
  },
  {
    brand: 'Apple',
    search: 'iphone apple',
    label: 'Apple Week',
    title: 'iPhone destacados de la semana',
    description: 'Selección de iPhone recomendados para fotografía, vídeo y uso profesional.',
    ctaLabel: 'Ver iPhone',
    href: '/categoria/smartphones?search=iphone',
    emptyMessage: 'No hemos encontrado iPhone para mostrar ahora mismo.',
    banner: '/banners/brand-week/smartphones/apple.webp',
  },
  {
    brand: 'Motorola',
    search: 'motorola moto',
    label: 'Motorola Week',
    title: 'Smartphones Motorola de la semana',
    description: 'Modelos Moto seleccionados para un uso fluido y fiable.',
    ctaLabel: 'Ver Motorola',
    href: '/categoria/smartphones?search=motorola',
    emptyMessage: 'No hemos encontrado smartphones Motorola para mostrar ahora mismo.',
    banner: '/banners/brand-week/smartphones/motorola.webp',
  },
];

export const defaultWeeklyCampaignConfig: WeeklyCampaignConfig = {
  laptops: laptopCampaigns,
  smartphones: smartphoneCampaigns,
};

function getIsoWeekNumber(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeeklyCampaignSet(config: WeeklyCampaignConfig, date = new Date()): WeeklyCampaignSet {
  const week = getIsoWeekNumber(date);
  const laptopList = config.laptops.length > 0 ? config.laptops : defaultWeeklyCampaignConfig.laptops;
  const smartphoneList = config.smartphones.length > 0 ? config.smartphones : defaultWeeklyCampaignConfig.smartphones;

  return {
    laptops: laptopList[(week - 1) % laptopList.length],
    smartphones: smartphoneList[(week - 1) % smartphoneList.length],
  };
}

function isValidCampaign(item: unknown): item is WeeklyBrandCampaign {
  if (!item || typeof item !== 'object') return false;
  const campaign = item as Partial<WeeklyBrandCampaign>;
  return Boolean(
    typeof campaign.brand === 'string' && campaign.brand.trim() !== '' &&
    typeof campaign.search === 'string' && campaign.search.trim() !== '' &&
    typeof campaign.title === 'string' && campaign.title.trim() !== '' &&
    typeof campaign.ctaLabel === 'string' &&
    typeof campaign.href === 'string'
  );
}

// El banner ancho es un asset local del frontend (/public/banners/...), no
// algo que gestione el backend de WordPress (dmi-sync) — ese solo decide qué
// marca toca esta semana. Si el payload remoto no trae `banner` para una
// marca, se completa con el de la config local por defecto (buscando por
// `brand`), para no depender de que WordPress conozca este campo.
function withLocalBanner(
  campaign: WeeklyBrandCampaign,
  localList: WeeklyBrandCampaign[]
): WeeklyBrandCampaign {
  if (campaign.banner) return campaign;
  const match = localList.find((item) => item.brand === campaign.brand);
  return match?.banner ? { ...campaign, banner: match.banner } : campaign;
}

export function normalizeWeeklyCampaignConfig(payload: unknown): WeeklyCampaignConfig {
  const value = payload as Partial<WeeklyCampaignConfig> | null;
  const laptopItems = value?.laptops;
  const smartphoneItems = value?.smartphones;
  const laptops = (Array.isArray(laptopItems) ? laptopItems.filter(isValidCampaign) : [])
    .map((c) => withLocalBanner(c, defaultWeeklyCampaignConfig.laptops));
  const smartphones = (Array.isArray(smartphoneItems) ? smartphoneItems.filter(isValidCampaign) : [])
    .map((c) => withLocalBanner(c, defaultWeeklyCampaignConfig.smartphones));

  return {
    laptops: laptops.length > 0 ? laptops : defaultWeeklyCampaignConfig.laptops,
    smartphones: smartphones.length > 0 ? smartphones : defaultWeeklyCampaignConfig.smartphones,
  };
}
