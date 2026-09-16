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

function tryParseJsonFromText(text: string) {
  const startIdx = Math.min(
    ...['[', '{']
      .map((ch) => {
        const i = text.indexOf(ch);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      })
  );

  if (startIdx === Number.MAX_SAFE_INTEGER) {
    return null;
  }

  try {
    return JSON.parse(text.slice(startIdx));
  } catch {
    return null;
  }
}

function normalizeWordPressBaseUrl(rawUrl?: string) {
  const fallback = 'https://inforvel.online';
  const value = (rawUrl || fallback).trim().replace(/\/+$/, '');

  if (value.endsWith('/wp-json')) {
    return value.replace(/\/wp-json$/, '');
  }

  if (value.endsWith('/wp-json/wc/v3')) {
    return value.replace(/\/wp-json\/wc\/v3$/, '');
  }

  return value;
}

const WP_URL = normalizeWordPressBaseUrl(
  process.env.NEXT_PUBLIC_WP_URL || process.env.NEXT_PUBLIC_WC_URL
);

// DEBUG: imprime la URL que Next está usando en tiempo de ejecución
if (process.env.NODE_ENV !== 'production') {
  console.debug('[debug] WP_URL =', WP_URL);
}

export async function getPosts(params: { per_page?: number; page?: number } = {}): Promise<WPPost[]> {
  try {
    const queryParams = new URLSearchParams({
      _embed: 'wp:featuredmedia,author',
      per_page: (params.per_page || 12).toString(),
      page: (params.page || 1).toString(),
      status: 'publish',
      orderby: 'date',
      order: 'desc',
    });

    const endpoint = `${WP_URL}/wp-json/wp/v2/posts?${queryParams}`;
    if (process.env.NODE_ENV !== 'production') console.debug('[debug] fetching posts from', endpoint);
    const response = await fetch(endpoint, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      console.error(`WordPress API error: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch posts');
    }

    const text = await response.text();
    const posts = tryParseJsonFromText(text);
    if (!Array.isArray(posts)) {
      console.error('WordPress posts response is not valid JSON:', text.slice(0, 1000));
      throw new Error('Invalid posts payload');
    }

    if (process.env.NODE_ENV !== 'production') console.debug(`[debug] Fetched ${posts.length} posts from ${WP_URL}`);
    return posts;
  } catch (error) {
    console.error('Error fetching WordPress posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  try {
    const response = await fetch(
      `${WP_URL}/wp-json/wp/v2/posts?slug=${slug}&_embed=wp:featuredmedia,author&status=publish`,
      {
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      console.error(`WordPress API error: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch post');
    }

    const text = await response.text();
    const posts = tryParseJsonFromText(text);
    if (!Array.isArray(posts)) {
      console.error('WordPress post response is not valid JSON:', text.slice(0, 1000));
      throw new Error('Invalid post payload');
    }

    console.log(`Fetched post with slug: ${slug}`, posts[0] ? 'found' : 'not found');
    return posts[0] || null;
  } catch (error) {
    console.error('Error fetching WordPress post:', error);
    return null;
  }
}
