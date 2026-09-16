import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';
import { CartSync } from '@/components/cart/CartSync';
import { CookieBanner } from '@/components/CookieBanner';
import { ConsentScripts } from '@/components/ConsentScripts';
import { woocommerce, WCCategory } from '@/lib/woocommerce';
import { getBaseUrl, siteConfig } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'] });
const siteIsIndexable = process.env.SITE_INDEXABLE !== 'false';

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: siteConfig.title,
    template: '%s | Inforvel',
  },
  description: siteConfig.description,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: siteIsIndexable,
    follow: siteIsIndexable,
    googleBot: {
      index: siteIsIndexable,
      follow: siteIsIndexable,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: '/logo.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: '/logo.png',
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let categories: WCCategory[] = [];

  try {
    categories = await woocommerce.getCategories({ per_page: 100 });
  } catch (error) {
    console.error('Error loading categories:', error);
  }

  return (
    <html lang="es" className="dark">
      <head>
        <meta name="google-adsense-account" content="ca-pub-6875978505250043" />
      </head>
      <body className={`${inter.className} bg-black text-white`}>
        <Script id="dev-storage-safety" strategy="beforeInteractive">
          {`(function () {
  try {
    if (typeof window === 'undefined') return;
    var isDevHost = window.location && window.location.hostname === 'dev.inforvel.online';
    if (!isDevHost) return;

    var forceReset = window.location.search.indexOf('reset_state=1') !== -1;
    var safeParse = function (raw) {
      try { return raw ? JSON.parse(raw) : null; } catch (_e) { return null; }
    };

    var cartRaw = window.localStorage.getItem('cart-storage');
    var cartParsed = safeParse(cartRaw);
    var cartLooksValid = !!(cartParsed && cartParsed.state && Array.isArray(cartParsed.state.items));

    if (forceReset || !cartLooksValid) {
      window.localStorage.removeItem('cart-storage');
      window.localStorage.removeItem('wc_auth_state');
      window.localStorage.removeItem('wc_user_email');
      window.localStorage.removeItem('cart_session_id');
      window.sessionStorage.removeItem('cart-storage');
    }
  } catch (_err) {}
})();`}
        </Script>
        <ConsentScripts />
        <Header categories={categories} />
        <main className="min-h-screen pt-20 md:pt-24">{children}</main>
        <Footer categories={categories} />
        <Toaster position="bottom-right" />
        <CartSync />
        <CookieBanner />
      </body>
    </html>
  );
}
