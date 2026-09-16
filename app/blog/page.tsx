import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { getPosts } from '@/lib/wordpress';
import { AdSense } from '@/components/AdSense';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Blog | Inforvel',
  description: 'Consejos, tutoriales y noticias sobre tecnología',
  alternates: {
    canonical: absoluteUrl('/blog'),
  },
  openGraph: {
    title: 'Blog | Inforvel',
    description: 'Consejos, tutoriales y noticias sobre tecnología',
    url: absoluteUrl('/blog'),
  },
};

export const revalidate = 60;
export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  let posts = await getPosts({ per_page: 12 });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog de Inforvel</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Consejos, tutoriales y las últimas noticias del mundo de la tecnología
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400">No hay artículos disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => {
              const featuredImage = post._embedded?.['wp:featuredmedia']?.[0];
              const author = post._embedded?.author?.[0];

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group"
                >
                  <article className="h-full rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950/50 hover:border-blue-500/50 transition-all duration-300">
                    {featuredImage && (
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={featuredImage.source_url}
                          alt={featuredImage.alt_text || post.title.rendered}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-4 text-sm text-zinc-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(post.date)}
                        </span>
                        {author && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {author.name}
                          </span>
                        )}
                      </div>
                      <h2
                        className="text-xl font-bold mb-3 group-hover:text-blue-400 transition-colors"
                        dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                      />
                      <p className="text-zinc-400 text-sm mb-4 line-clamp-3">
                        {stripHtml(post.excerpt.rendered)}
                      </p>
                      <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                        Leer más
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        {/* AdSense - parte inferior del blog */}
        <AdSense adSlot="4838089477" className="mt-12" />
      </div>
    </div>
  );
}
