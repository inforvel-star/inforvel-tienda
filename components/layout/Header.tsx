'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ShoppingBag, Search, User, Menu, X, LogOut } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { authAPI } from '@/lib/api/auth';
import { MiniCart } from './MiniCart';
import { SearchBar } from './SearchBar';
import { Button } from '@/components/ui/button';
import { WCCategory } from '@/lib/woocommerce';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface HeaderProps {
  categories?: WCCategory[];
}

export function Header({ categories = [] }: HeaderProps) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const { toggleCart, getItemCount } = useCartStore();
  const itemCount = getItemCount();

  useEffect(() => {
    setIsLoggedIn(authAPI.isAuthenticated());
    setUserName(authAPI.getUserDisplayName());
  }, []);

  const handleLogout = () => {
    authAPI.logout();
    setIsLoggedIn(false);
    setUserName(null);
    toast.success('Sesión cerrada correctamente');
    router.push('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-background/80 backdrop-blur-lg border-b border-border shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center transition-transform group-hover:scale-105">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg hidden sm:block">Inforvel</span>
              </Link>

              <nav className="hidden lg:flex items-center gap-6">
                <Link
                  href="/tienda"
                  className="text-sm font-medium hover:text-blue-500 transition-colors"
                >
                  Tienda
                </Link>
                {categories.slice(0, 4).map((category) => (
                  <Link
                    key={category.id}
                    href={`/categoria/${category.slug}`}
                    className="text-sm font-medium hover:text-blue-500 transition-colors"
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                className="hidden sm:flex"
              >
                <Search className="w-5 h-5" />
              </Button>

              {isLoggedIn ? (
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {userName || 'Usuario'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" size="icon" title="Iniciar sesión">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCart}
                className="relative"
              >
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background">
            <nav className="flex flex-col p-4 gap-2">
              <Link
                href="/tienda"
                className="px-4 py-2 hover:bg-accent rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tienda
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
                  className="px-4 py-2 hover:bg-accent rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <MiniCart />
      <SearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
