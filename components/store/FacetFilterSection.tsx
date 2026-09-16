'use client';

import type { FacetOption } from '@/lib/storeFacets';

interface FacetFilterSectionProps {
  idPrefix: string;
  title: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyLabel?: string;
}

export function FacetFilterSection({
  idPrefix,
  title,
  options,
  selected,
  onToggle,
  emptyLabel = 'Sin opciones disponibles',
}: FacetFilterSectionProps) {
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
      {options.length > 0 ? (
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {options.map((option) => {
            const id = `${idPrefix}-${option.value}`;
            return (
              <label key={option.value} htmlFor={id} className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-zinc-900">
                <input
                  id={id}
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => onToggle(option.value)}
                  className="iv-focus rounded border-zinc-600 bg-zinc-900"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{option.label}</span>
                <span className="text-xs tabular-nums text-zinc-500">({option.count})</span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="px-2 py-2 text-xs text-zinc-500">{emptyLabel}</p>
      )}
    </section>
  );
}
