import type { WCProduct } from '@/lib/woocommerce';

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface ActivePriceRange {
  min: number;
  max: number;
}

export interface StoreFilters {
  brands: string[];
  categories: string[];
  priceRanges: ActivePriceRange[];
  inStockOnly: boolean;
}

type OmittedFacet = 'brand' | 'category';

export function normalizeFacetValue(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function displayBrand(value: string): string {
  const name = String(value || '').trim();
  if (!name) return 'Sin marca';
  if (/^[A-Z0-9-]{2,4}$/.test(name)) return name;
  if (name === name.toUpperCase()) {
    return name.toLocaleLowerCase('es-ES').replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-ES'));
  }
  return name;
}

export function getProductBrandFacet(product: WCProduct): { value: string; label: string } {
  const attributeBrand = product.attributes?.find((attribute) =>
    /^(marca|brand|fabricante)$/i.test(String(attribute.name || '').trim()),
  )?.options?.[0];
  const metadataBrand = product.meta_data?.find((item) =>
    /^(_megasur_fabricante|brand|marca|fabricante)$/i.test(String(item.key || '').trim()),
  )?.value;
  const rawBrand = String(attributeBrand || metadataBrand || '').trim() || 'Sin marca';

  return {
    value: normalizeFacetValue(rawBrand) || 'sin-marca',
    label: displayBrand(rawBrand),
  };
}

export function getProductCategoryFacets(product: WCProduct): Array<{ value: string; label: string }> {
  const unique = new Map<string, string>();
  for (const category of product.categories || []) {
    const categoryId = Number(category.id);
    const slug = String(category.slug || '').trim();
    if (!Number.isInteger(categoryId) || categoryId <= 0 || !slug) continue;

    const value = normalizeFacetValue(slug);
    if (value && !unique.has(value)) unique.set(value, String(category.name || slug).trim());
  }
  return Array.from(unique, ([value, label]) => ({ value, label }));
}

function matchesPrice(product: WCProduct, ranges: ActivePriceRange[]): boolean {
  if (!ranges.length) return true;
  const price = Number.parseFloat(product.price);
  return Number.isFinite(price) && ranges.some((range) => price >= range.min && price < range.max);
}

function matchesStoreFilters(product: WCProduct, filters: StoreFilters, omit?: OmittedFacet): boolean {
  if (omit !== 'brand' && filters.brands.length > 0) {
    if (!filters.brands.includes(getProductBrandFacet(product).value)) return false;
  }

  if (omit !== 'category' && filters.categories.length > 0) {
    const categories = getProductCategoryFacets(product).map((category) => category.value);
    if (!filters.categories.some((category) => categories.includes(category))) return false;
  }

  if (!matchesPrice(product, filters.priceRanges)) return false;
  if (filters.inStockOnly && product.stock_status !== 'instock') return false;
  return true;
}

export function filterStoreProducts(products: WCProduct[], filters: StoreFilters): WCProduct[] {
  return products.filter((product) => matchesStoreFilters(product, filters));
}

function buildFacetOptions(
  products: WCProduct[],
  extract: (product: WCProduct) => Array<{ value: string; label: string }>,
): FacetOption[] {
  const facets = new Map<string, FacetOption>();
  for (const product of products) {
    for (const item of extract(product)) {
      const existing = facets.get(item.value);
      if (existing) existing.count += 1;
      else facets.set(item.value, { ...item, count: 1 });
    }
  }

  return Array.from(facets.values()).sort((left, right) =>
    right.count - left.count || left.label.localeCompare(right.label, 'es'),
  );
}

export function buildBrandFacets(products: WCProduct[], filters: StoreFilters): FacetOption[] {
  const eligible = products.filter((product) => matchesStoreFilters(product, filters, 'brand'));
  return buildFacetOptions(eligible, (product) => [getProductBrandFacet(product)]);
}

export function buildCategoryFacets(products: WCProduct[], filters: StoreFilters): FacetOption[] {
  const eligible = products.filter((product) => matchesStoreFilters(product, filters, 'category'));
  return buildFacetOptions(eligible, getProductCategoryFacets);
}

export function retainSelectedFacetOptions(
  current: FacetOption[],
  allOptions: FacetOption[],
  selected: string[],
): FacetOption[] {
  const merged = new Map(current.map((option) => [option.value, option]));
  const labels = new Map(allOptions.map((option) => [option.value, option.label]));
  for (const value of selected) {
    if (!merged.has(value)) {
      merged.set(value, { value, label: labels.get(value) || value.replace(/-/g, ' '), count: 0 });
    }
  }
  return Array.from(merged.values());
}
