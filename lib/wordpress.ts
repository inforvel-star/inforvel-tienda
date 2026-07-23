export interface WPPost {
  id: number;
  date: string;
  title: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  slug: string;
  featured_media: number;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
    }>;
    author?: Array<{
      name: string;
    }>;
  };
}

const WP_URL = process.env.NEXT_PUBLIC_WC_URL || 'https://inforvel.online';

export async function getPosts(params: { per_page?: number; page?: number } = {}): Promise<WPPost[]> {
  try {
    const queryParams = new URLSearchParams({
      _embed: 'wp:featuredmedia,author',
      per_page: (params.per_page || 12).toString(),
      page: (params.page || 1).toString(),
    });

    const response = await fetch(`${WP_URL}/wp-json/wp/v2/posts?${queryParams}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching WordPress posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  try {
    const response = await fetch(
      `${WP_URL}/wp-json/wp/v2/posts?slug=${slug}&_embed=wp:featuredmedia,author`,
      {
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch post');
    }

    const posts = await response.json();
    return posts[0] || null;
  } catch (error) {
    console.error('Error fetching WordPress post:', error);
    return null;
  }
}
