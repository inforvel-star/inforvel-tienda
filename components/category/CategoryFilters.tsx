'use client';

import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';

interface Term    { id: number; name: string; slug: string }
interface Attr    { id: number; name: string; slug: string; terms: Record<string | number, Term> }
interface Filters {
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  attributes: Record<string, string[]>;
}

interface Props {
  attributes: Attr[];
  priceRange:  { min: number; max: number };
  filters:     Filters;
  onChange:    (f: Filters) => void;
}

function Section({
  title,
  children,
  activeCount = 0,
}: {
  title: string;
  children: React.ReactNode;
  activeCount?: number;
}) {
  const [open, setOpen] = useState(activeCount > 0);

  return (
    <div className="border-b border-zinc-800 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-zinc-200 hover:text-white"
      >
        <span className="min-w-0 truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] leading-none text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export function CategoryFilters({ attributes, priceRange, filters, onChange }: Props) {
  const [localMin, setLocalMin] = useState(filters.minPrice ?? priceRange.min);
  const [localMax, setLocalMax] = useState(filters.maxPrice ?? priceRange.max);

  const toggleAttrTerm = (attrSlug: string, termName: string) => {
    const current = filters.attributes[attrSlug] ?? [];
    const updated  = current.includes(termName)
      ? current.filter((t) => t !== termName)
      : [...current, termName];
    onChange({
      ...filters,
      attributes: { ...filters.attributes, [attrSlug]: updated },
    });
  };

  const applyPrice = () => {
    onChange({ ...filters, minPrice: localMin, maxPrice: localMax });
  };

  const activeCount =
    (filters.inStock ? 1 : 0) +
    (filters.rating ? 1 : 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    Object.values(filters.attributes).flat().length;

  const reset = () => {
    setLocalMin(priceRange.min);
    setLocalMax(priceRange.max);
    onChange({ attributes: {} });
  };

  return (
    <aside className="w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 pb-3 lg:bg-black">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">{activeCount}</span>
          )}
        </div>
        {activeCount > 0 && (
          <button type="button" onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      <div className="divide-y divide-zinc-800">
        {/* En stock */}
        <Section title="Disponibilidad" activeCount={filters.inStock ? 1 : 0}>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={!!filters.inStock}
              onChange={(e) => onChange({ ...filters, inStock: e.target.checked })}
              className="accent-blue-500"
            />
            En stock
          </label>
        </Section>

        {/* Precio */}
        <Section
          title="Precio"
          activeCount={filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0}
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs text-zinc-500">Mínimo</label>
              <input
                type="number"
                value={localMin}
                min={priceRange.min}
                max={localMax}
                onChange={(e) => setLocalMin(Number(e.target.value))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
              />
            </div>
            <span className="mt-4 text-zinc-500">-</span>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs text-zinc-500">Máximo</label>
              <input
                type="number"
                value={localMax}
                min={localMin}
                max={priceRange.max}
                onChange={(e) => setLocalMax(Number(e.target.value))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={applyPrice}
            className="w-full rounded bg-zinc-800 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Aplicar precio
          </button>
        </Section>

        {/* Valoración */}
        <Section title="Valoración mínima" activeCount={filters.rating ? 1 : 0}>
          <div className="flex flex-col gap-1">
            {[4, 3, 2, 1].map((star) => (
              <label key={star} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.rating === star}
                  onChange={() => onChange({ ...filters, rating: filters.rating === star ? undefined : star })}
                  className="accent-blue-500"
                />
                {'★'.repeat(star)}{'☆'.repeat(5 - star)} y más
              </label>
            ))}
          </div>
        </Section>

        {/* Atributos dinámicos */}
        {attributes.map((attr) => {
          const terms = Object.values(attr.terms);
          const selectedTerms = filters.attributes[attr.slug] ?? [];
          if (!terms.length) return null;
          return (
            <Section key={attr.slug} title={attr.name} activeCount={selectedTerms.length}>
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-2">
                {terms.map((term) => (
                  <label key={term.slug} className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={selectedTerms.includes(term.slug)}
                      onChange={() => toggleAttrTerm(attr.slug, term.slug)}
                      className="mt-0.5 accent-blue-500"
                    />
                    <span className="leading-snug">{term.name}</span>
                  </label>
                ))}
              </div>
            </Section>
          );
        })}
      </div>
    </aside>
  );
}
