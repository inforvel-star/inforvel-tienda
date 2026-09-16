'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Filter,
} from 'lucide-react';
import { WCProduct } from '@/lib/woocommerce';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Button } from '@/components/ui/button';
import { FacetFilterSection } from '@/components/store/FacetFilterSection';
import { NewsletterSignup } from '@/components/marketing/NewsletterSignup';
import {
  buildBrandFacets,
  buildCategoryFacets,
  filterStoreProducts,
  retainSelectedFacetOptions,
  type StoreFilters,
} from '@/lib/storeFacets';

interface PriceRange {
  min: number;
  max: number;
  label: string;
}

const priceRanges: PriceRange[] = [
  { min: 0, max: 50, label: 'Menos de 50€' },
  { min: 50, max: 100, label: '50€ - 100€' },
  { min: 100, max: 500, label: '100€ - 500€' },
  { min: 500, max: Infinity, label: 'Más de 500€' },
];

type SearchParamValue = string | string[] | undefined;

interface TiendaPageProps {
  searchParams?: {
    search?: SearchParamValue;
    marca?: SearchParamValue;
    categoria?: SearchParamValue;
    precio?: SearchParamValue;
    stock?: SearchParamValue;
  };
}

function readParam(value: SearchParamValue): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function readCsvParam(value: SearchParamValue): string[] {
  return Array.from(new Set(
    readParam(value).split(',').map((item) => item.trim().toLocaleLowerCase('es-ES')).filter(Boolean),
  ));
}

function readPriceParam(value: SearchParamValue): number[] {
  return readCsvParam(value)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item >= 0 && item < priceRanges.length);
}

export default function TiendaPage({ searchParams }: TiendaPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const brandParam = readParam(searchParams?.marca);
  const categoryParam = readParam(searchParams?.categoria);
  const priceParam = readParam(searchParams?.precio);
  const stockParam = readParam(searchParams?.stock);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => readCsvParam(brandParam));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => readCsvParam(categoryParam));
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<number[]>(() => readPriceParam(priceParam));
  const [inStockOnly, setInStockOnly] = useState(stockParam === '1');
  const [sortBy, setSortBy] = useState('featured');
  const urlSearch = readParam(searchParams?.search).trim();

  useEffect(() => {
    setSelectedBrands(readCsvParam(brandParam));
    setSelectedCategories(readCsvParam(categoryParam));
    setSelectedPriceRanges(readPriceParam(priceParam));
    setInStockOnly(stockParam === '1');
  }, [brandParam, categoryParam, priceParam, stockParam]);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const endpoints = urlSearch
          ? [1, 2].map((page) => `/api/products?view=store&per_page=100&page=${page}&search=${encodeURIComponent(urlSearch)}`)
          : ['/api/products?view=store&per_page=100'];
        const responses = await Promise.all(endpoints.map((endpoint) => fetch(endpoint)));
        const pages = await Promise.all(responses.map((response) => response.json()));
        const uniqueProducts = new Map<number, WCProduct>();
        pages.forEach((page) => {
          if (Array.isArray(page)) page.forEach((product) => uniqueProducts.set(product.id, product));
        });
        setProducts(Array.from(uniqueProducts.values()));
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [urlSearch]);

  const activePriceRanges = useMemo(
    () => selectedPriceRanges.map((index) => priceRanges[index]).filter(Boolean),
    [selectedPriceRanges],
  );
  const filters: StoreFilters = useMemo(() => ({
    brands: selectedBrands,
    categories: selectedCategories,
    priceRanges: activePriceRanges,
    inStockOnly,
  }), [selectedBrands, selectedCategories, activePriceRanges, inStockOnly]);
  const unfilteredFacetState: StoreFilters = useMemo(() => ({
    brands: [], categories: [], priceRanges: [], inStockOnly: false,
  }), []);
  const allBrandFacets = useMemo(() => buildBrandFacets(products, unfilteredFacetState), [products, unfilteredFacetState]);
  const allCategoryFacets = useMemo(() => buildCategoryFacets(products, unfilteredFacetState), [products, unfilteredFacetState]);
  const brandFacets = useMemo(() => retainSelectedFacetOptions(
    buildBrandFacets(products, filters), allBrandFacets, selectedBrands,
  ), [products, filters, allBrandFacets, selectedBrands]);
  const categoryFacets = useMemo(() => retainSelectedFacetOptions(
    buildCategoryFacets(products, filters), allCategoryFacets, selectedCategories,
  ), [products, filters, allCategoryFacets, selectedCategories]);
  const filteredProducts = useMemo(() => {
    const filtered = filterStoreProducts(products, filters);
    if (sortBy === 'price-asc') filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    else if (sortBy === 'price-desc') filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    return filtered;
  }, [products, filters, sortBy]);

  const updateFilterUrl = (overrides: Partial<{
    brands: string[];
    categories: string[];
    priceRanges: number[];
    inStockOnly: boolean;
  }>) => {
    const next = {
      brands: overrides.brands ?? selectedBrands,
      categories: overrides.categories ?? selectedCategories,
      priceRanges: overrides.priceRanges ?? selectedPriceRanges,
      inStockOnly: overrides.inStockOnly ?? inStockOnly,
    };
    const params = new URLSearchParams();
    if (urlSearch) params.set('search', urlSearch);
    if (next.brands.length) params.set('marca', next.brands.join(','));
    if (next.categories.length) params.set('categoria', next.categories.join(','));
    if (next.priceRanges.length) params.set('precio', next.priceRanges.join(','));
    if (next.inStockOnly) params.set('stock', '1');
    const query = params.toString().replace(/%2C/gi, ',');
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const toggleFacet = (value: string, selected: string[], setSelected: (values: string[]) => void, key: 'brands' | 'categories') => {
    const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
    setSelected(next);
    updateFilterUrl({ [key]: next });
  };

  const togglePriceRange = (index: number) => {
    const next = selectedPriceRanges.includes(index)
      ? selectedPriceRanges.filter((item) => item !== index)
      : [...selectedPriceRanges, index];
    setSelectedPriceRanges(next);
    updateFilterUrl({ priceRanges: next });
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSelectedPriceRanges([]);
    setInStockOnly(false);
    setSortBy('featured');
    router.push(pathname, { scroll: false });
  };

  const hasActiveFilters = selectedBrands.length > 0 || selectedCategories.length > 0
    || selectedPriceRanges.length > 0 || inStockOnly || Boolean(urlSearch);

  const visibleCount = useMemo(() => (loading ? 0 : filteredProducts.length), [loading, filteredProducts.length]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row">
        <aside className="lg:w-72 lg:shrink-0">
          <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><Filter className="h-4 w-4 text-blue-400" />Filtros</h3>

            <div className="space-y-4">
              <FacetFilterSection
                idPrefix="brand"
                title="Marca"
                options={brandFacets}
                selected={selectedBrands}
                onToggle={(value) => toggleFacet(value, selectedBrands, setSelectedBrands, 'brands')}
              />

              <div className="border-t border-zinc-800 pt-4">
                <FacetFilterSection
                  idPrefix="category"
                  title="Categoría"
                  options={categoryFacets}
                  selected={selectedCategories}
                  onToggle={(value) => toggleFacet(value, selectedCategories, setSelectedCategories, 'categories')}
                />
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Precio</p>
                <div className="space-y-2">
                  {priceRanges.map((range, index) => (
                    <label key={index} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-zinc-900">
                      <input
                        type="checkbox"
                        checked={selectedPriceRanges.includes(index)}
                        onChange={() => togglePriceRange(index)}
                        className="iv-focus rounded border-zinc-600 bg-zinc-900"
                      />
                      <span className="text-sm text-zinc-300">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Disponibilidad</p>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(event) => {
                      setInStockOnly(event.target.checked);
                      updateFilterUrl({ inStockOnly: event.target.checked });
                    }}
                    className="iv-focus rounded border-zinc-600 bg-zinc-900"
                  />
                  <span className="text-sm text-zinc-300">Solo en stock</span>
                </label>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" className="iv-focus w-full border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-300">
              {loading ? 'Cargando catálogo...' : `${visibleCount} productos encontrados`}
            </p>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="iv-focus min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-100"
            >
              <option value="featured">Destacados</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="mb-3 aspect-square rounded-lg bg-zinc-800" />
                  <div className="mb-2 h-3 rounded bg-zinc-800" />
                  <div className="h-3 w-2/3 rounded bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 py-16 text-center">
              <p className="mb-4 text-sm text-zinc-300">No se encontraron productos con los filtros actuales.</p>
              <Button variant="outline" className="iv-focus border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <ProductGrid products={filteredProducts} />
          )}
        </div>
      </div>

        <div className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:pl-[312px]">
          <NewsletterSignup />
        </div>
    </div>
  );
}
