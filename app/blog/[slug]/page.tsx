import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { getPostBySlug } from '@/lib/wordpress';
import { notFound } from 'next/navigation';
import { AdSense } from '@/components/AdSense';
import { absoluteUrl } from '@/lib/seo';

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Post no encontrado',
    };
  }

  return {
    title: `${post.title.rendered} | Blog Inforvel`,
    description: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 160),
    alternates: {
      canonical: absoluteUrl(`/blog/${post.slug}`),
    },
    openGraph: {
      type: 'article',
      title: post.title.rendered.replace(/<[^>]*>/g, ''),
      description: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 160),
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.date,
      modifiedTime: post.date,
    },
  };
}

export const revalidate = 60;
export const dynamic = 'force-dynamic';

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0];
  const author = post._embedded?.author?.[0];

  return (
    <div className="min-h-screen pt-20 pb-16 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al blog
        </Link>

        {/* Layout: artículo + sidebar con anuncio */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Artículo principal */}
          <article className="flex-1 min-w-0 max-w-4xl">
            {featuredImage && (
              <div className="relative aspect-video rounded-2xl overflow-hidden mb-8">
                <Image
                  src={featuredImage.source_url}
                  alt={featuredImage.alt_text || post.title.rendered}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <header className="mb-8">
              <h1
                className="text-4xl md:text-5xl font-bold mb-6"
                dangerouslySetInnerHTML={{ __html: post.title.rendered }}
              />
              <div className="flex items-center gap-6 text-zinc-400">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {formatDate(post.date)}
                </span>
                {author && (
                  <span className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {author.name}
                  </span>
                )}
              </div>
            </header>

            <div
              className="prose prose-invert prose-lg max-w-none
                prose-headings:text-white
                prose-p:text-zinc-300 prose-p:mb-4
                prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300
                prose-strong:text-white
                prose-code:text-blue-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800
                prose-img:my-8 prose-img:rounded-xl
                prose-li:text-zinc-300
                prose-ul:text-zinc-300
                prose-h2:text-white prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-white prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
                prose-h4:text-white prose-h4:text-lg prose-h4:font-semibold prose-h4:mt-4 prose-h4:mb-2
                [&_p+p]:mt-4 [&_figure]:my-8 [&_figure_img]:my-0"
              dangerouslySetInnerHTML={{ __html: post.content.rendered }}
            />

            {/* Anuncio después del artículo */}
            <AdSense adSlot="4838089477" className="mt-10" />
          </article>

          {/* Sidebar derecho con anuncio (solo desktop) */}
          <aside className="hidden lg:block w-[300px] shrink-0">
            <div className="sticky top-28">
              <AdSense adSlot="4838089477" adFormat="auto" />
            </div>
          </aside>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-900">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Ver más artículos
          </Link>
        </div>
      </div>
    </div>
  );
}
