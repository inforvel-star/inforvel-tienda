'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { woocommerce, WCProduct } from '@/lib/woocommerce';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchBar({ isOpen, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WCProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setResults([]);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        const products = await woocommerce.searchProducts(query);
        setResults(products);
        setIsLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-top">
        <div className="max-w-2xl mx-auto bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Buscar productos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-lg"
            />
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {query.trim().length >= 2 && (
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Buscando...
                </div>
              ) : results.length > 0 ? (
                <div className="p-2">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/producto/${product.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-accent shrink-0">
                        <Image
                          src={product.images[0]?.src || '/placeholder.png'}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-2 mb-1">
                          {product.name}
                        </h3>
                        <p className="text-sm font-bold text-blue-500">
                          {product.price}€
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No se encontraron productos
                </div>
              )}
            </div>
          )}

          {query.trim().length < 2 && query.length > 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Escribe al menos 2 caracteres para buscar
            </div>
          )}
        </div>
      </div>
    </>
  );
}
