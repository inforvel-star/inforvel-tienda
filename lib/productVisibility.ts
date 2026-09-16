type ProductLike = {
  price?: string | number | null;
  images?: Array<{ src?: string | null }>;
};

function parsePositivePrice(value: unknown): number | null {
  const parsed = Number.parseFloat(String(value ?? '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function isPlaceholderImageUrl(value: string | null | undefined): boolean {
  const src = String(value ?? '').trim().toLowerCase();
  if (!src) {
    return true;
  }

  return (
    src === '/placeholder.png' ||
    src.includes('woocommerce-placeholder') ||
    src.includes('/placeholder.') ||
    src.includes('/no-image') ||
    src.includes('/no_image') ||
    src.includes('/sin-imagen') ||
    src.includes('/sin_imagen')
  );
}

export function hasValidDisplayPrice(product: ProductLike): boolean {
  return parsePositivePrice(product.price) !== null;
}

export function getPrimaryImageSrc(product: ProductLike): string | null {
  const images = Array.isArray(product.images) ? product.images : [];

  for (const image of images) {
    const src = String(image?.src ?? '').trim();
    if (!src || isPlaceholderImageUrl(src)) {
      continue;
    }
    return src;
  }

  return null;
}

export function hasValidDisplayImage(product: ProductLike): boolean {
  return getPrimaryImageSrc(product) !== null;
}

export function isDisplayableProduct(product: ProductLike): boolean {
  return hasValidDisplayPrice(product) && hasValidDisplayImage(product);
}
