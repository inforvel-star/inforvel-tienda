import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { getPostBySlug, getPosts } from '@/lib/wordpress';
import { notFound } from 'next/navigation';

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
  };
}

export async function generateStaticParams() {
  const posts = await getPosts({ per_page: 50 });
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al blog
        </Link>

        <article>
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
              prose-p:text-zinc-300
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300
              prose-strong:text-white
              prose-code:text-blue-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800
              prose-img:rounded-xl
              prose-li:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: post.content.rendered }}
          />
        </article>

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
