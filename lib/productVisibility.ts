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

export function hasValidDisplayPrice(product: ProductLike): boolean {
  return parsePositivePrice(product.price) !== null;
}

export function getPrimaryImageSrc(product: ProductLike): string | null {
  const src = String(product.images?.[0]?.src ?? '').trim();
  if (!src) {
    return null;
  }

  // Consideramos placeholders como "sin imagen" para ocultarlos del catálogo público.
  const normalized = src.toLowerCase();
  if (
    normalized === '/placeholder.png' ||
    normalized.includes('woocommerce-placeholder') ||
    normalized.includes('/placeholder.') ||
    normalized.includes('/no-image') ||
    normalized.includes('/no_image') ||
    normalized.includes('/sin-imagen') ||
    normalized.includes('/sin_imagen')
  ) {
    return null;
  }

  return src;
}

export function hasValidDisplayImage(product: ProductLike): boolean {
  return getPrimaryImageSrc(product) !== null;
}

export function isDisplayableProduct(product: ProductLike): boolean {
  return hasValidDisplayPrice(product) && hasValidDisplayImage(product);
}
