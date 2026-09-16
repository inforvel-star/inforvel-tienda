import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';

type FeedItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  imageUrl?: string;
};

type GeneratedPost = {
  title: string;
  excerpt: string;
  contentHtml: string;
  imagePrompt: string;
  seoKeyword: string;
};

type State = {
  publishedSourceHashes: string[];
};

function loadLocalEnvFiles() {
  const files = [path.join(process.cwd(), '.env'), path.join(process.cwd(), '.env.local')];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnvFiles();

const FEEDS = [
  'https://www.xataka.com/feedburner.xml',
  'https://www.europapress.es/rss/rss.aspx?ch=00345',
  'https://www.genbeta.com/feedburner.xml',
  'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/tecnologia/portada',
  'https://www.20minutos.es/rss/tecnologia/',
  'https://hipertextual.com/feed',
];

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const WP_BASE_URL = (process.env.BLOG_WP_BASE_URL || process.env.NEXT_PUBLIC_WC_URL || '').replace(/\/+$/, '');
const WP_USER = process.env.BLOG_WP_USER || process.env.BLOG_WP_USERNAME || '';
const WP_APP_PASSWORD = process.env.BLOG_WP_APP_PASSWORD || process.env.BLOG_WP_APPLICATION_PASSWORD || '';
const BLOG_AUTHOR_ID = Number(process.env.BLOG_AUTHOR_ID || '1');
const BLOG_STATUS = process.env.BLOG_AUTOPUBLISH_STATUS || 'publish';
const BLOG_CATEGORY_NAME = process.env.BLOG_CATEGORY_NAME || 'Noticias tecnológicas';
const MAX_SOURCE_AGE_DAYS = Number(process.env.BLOG_MAX_SOURCE_AGE_DAYS || '5');
const DRY_RUN = process.argv.includes('--dry-run');

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const STATE_FILE = path.join(STORAGE_DIR, 'blog-autopublish-state.json');
const TMP_DIR = path.join(STORAGE_DIR, 'tmp-blog-autopublish');

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      const code = Number.parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ' '));
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? decodeHtmlEntities(match[1]) : '';
}

function hashSource(value: string): string {
  return crypto.createHash('sha1').update(value).digest('hex');
}

async function loadState(): Promise<State> {
  try {
    const raw = await readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.publishedSourceHashes)) {
      return { publishedSourceHashes: parsed.publishedSourceHashes };
    }
    return { publishedSourceHashes: [] };
  } catch {
    return { publishedSourceHashes: [] };
  }
}

async function saveState(state: State) {
  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'InforvelBlogBot/1.0 (+https://inforvel.online)',
      Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
    },
  });

  if (!res.ok) {
    throw new Error(`Error fetching ${url}: ${res.status}`);
  }

  return res.text();
}

function parseRssItems(xml: string, source: string): FeedItem[] {
  const items = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).map((m) => m[0]);

  return items
    .map((item): FeedItem | null => {
      const title = extractTag(item, 'title');
      const link = extractTag(item, 'link');
      const pubDate = extractTag(item, 'pubDate') || extractTag(item, 'dc:date');
      const description = extractTag(item, 'description') || extractTag(item, 'content:encoded');
      const mediaMatch = item.match(/<media:content[^>]*url="([^"]+)"/i) || item.match(/<enclosure[^>]*url="([^"]+)"/i);
      const imageUrl = mediaMatch?.[1];

      if (!title || !link) return null;
      return {
        title: stripHtml(title),
        link: link.trim(),
        pubDate: pubDate.trim(),
        description: stripHtml(description).slice(0, 700),
        source,
        imageUrl,
      };
    })
    .filter((v): v is FeedItem => Boolean(v));
}

function isRecent(item: FeedItem): boolean {
  const date = new Date(item.pubDate);
  if (Number.isNaN(date.getTime())) return false;
  const maxAgeMs = MAX_SOURCE_AGE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() <= maxAgeMs;
}

function isTechFocused(item: FeedItem): boolean {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const includeKeywords = [
    'tecnolog',
    'smartphone',
    'portátil',
    'laptop',
    'intel',
    'amd',
    'nvidia',
    'apple',
    'android',
    'ia generativa',
    'chatgpt',
    'gemini',
    'lanzamiento',
    'presenta',
    'nuevo producto',
    'feria',
    'mwc',
    'ces',
    'ifa',
    'startup',
    'chip',
    'semiconductor',
    'robot',
    'gadget',
    'software',
    'hardware',
    'ciberseguridad',
    '5g',
    '6g',
    'cloud',
    'nube',
    'computación',
    'españa',
    'barcelona',
    'madrid',
    'valencia',
    'bilbao',
  ];
  const excludeKeywords = ['tráiler', 'serie', 'película', 'cine', 'fútbol', 'deportes', 'famos'];
  const hasInclude = includeKeywords.some((k) => text.includes(k));
  const hasExclude = excludeKeywords.some((k) => text.includes(k));
  return hasInclude && !hasExclude;
}

async function pickSourceItem(state: State): Promise<FeedItem | null> {
  const allItems: FeedItem[] = [];

  for (const feedUrl of FEEDS) {
    try {
      const xml = await fetchText(feedUrl);
      allItems.push(...parseRssItems(xml, feedUrl));
    } catch (error) {
      console.error(`[blog-autopublish] Feed skipped ${feedUrl}:`, error);
    }
  }

  const unique = allItems
    .filter(isRecent)
    .filter(isTechFocused)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .filter((item) => !state.publishedSourceHashes.includes(hashSource(item.link)));

  return unique[0] || null;
}

async function openAIChatJson(prompt: string): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_TEXT_MODEL,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Eres editor tecnológico senior de un e-commerce español. Entregas solo JSON válido.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI text error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw);
}

async function generatePost(item: FeedItem): Promise<GeneratedPost> {
  if (!OPENAI_API_KEY) {
    const title = `Noticias tecnológicas: ${item.title}`;
    return {
      title,
      excerpt: `Resumen y análisis en clave España sobre ${item.title}.`,
      contentHtml: `<p><strong>Fuente analizada:</strong> <a href="${item.link}" target="_blank" rel="noopener noreferrer nofollow">${item.source}</a></p><h2>Resumen rápido</h2><p>${item.description || 'Noticia tecnológica reciente de interés para usuarios y empresas en España.'}</p><h2>Qué significa para España</h2><p>Este lanzamiento refuerza la tendencia de digitalización acelerada y abre oportunidades para pymes, educación y hogar conectado.</p><h2>Recomendación de Inforvel</h2><p>Antes de comprar, compara compatibilidad, garantía, actualizaciones de software y coste total a 24 meses.</p><p><em>Artículo generado automáticamente para seguimiento diario de actualidad tecnológica.</em></p>`,
      imagePrompt: `Editorial technology news illustration, ${item.title}, futuristic but realistic, Spain context, clean composition, high detail, no logos, no text`,
      seoKeyword: 'noticias tecnologicas espana',
    };
  }

  const prompt = `
Genera un artículo ORIGINAL en español para el blog de Inforvel, orientado a: noticias tecnológicas, productos novedosos, últimos lanzamientos y ferias tecnológicas en España.

Datos fuente:
- Titular: ${item.title}
- URL fuente: ${item.link}
- Fecha: ${item.pubDate}
- Resumen fuente: ${item.description}

Devuelve JSON con claves exactas:
{
  "title": "...",
  "excerpt": "...",
  "contentHtml": "...",
  "imagePrompt": "...",
  "seoKeyword": "..."
}

Reglas:
- No copies texto literal de la fuente.
- 900-1400 palabras aproximadas en contentHtml.
- Estructura HTML con h2/h3, párrafos y una tabla comparativa cuando aplique.
- Incluye sección "Impacto en España" y sección "Consejo de compra Inforvel".
- Tono periodístico-profesional.
- No usar claims no verificables.
- Sin emojis en title.
`;

  const obj = await openAIChatJson(prompt);

  return {
    title: String(obj.title || `Noticias tecnológicas: ${item.title}`).slice(0, 180),
    excerpt: String(obj.excerpt || item.description || '').slice(0, 300),
    contentHtml: String(obj.contentHtml || `<p>${item.description}</p>`),
    imagePrompt: String(obj.imagePrompt || `Technology launch news in Spain, ${item.title}`),
    seoKeyword: String(obj.seoKeyword || 'noticias tecnologicas espana').slice(0, 120),
  };
}

async function generateImageToFile(prompt: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  await mkdir(TMP_DIR, { recursive: true });
  const outPath = path.join(TMP_DIR, `${Date.now()}-${Math.random().toString(16).slice(2)}.png`);

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: '1536x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI image error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return null;

  await writeFile(outPath, Buffer.from(b64, 'base64'));
  return outPath;
}

function wpAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
}

async function ensureWpCategory(categoryName: string): Promise<number | null> {
  const listRes = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}&per_page=20`, {
    headers: { Authorization: wpAuthHeader() },
  });
  if (!listRes.ok) return null;
  const categories = await listRes.json();
  const existing = (categories || []).find((c: any) => (c?.name || '').toLowerCase() === categoryName.toLowerCase());
  if (existing?.id) return Number(existing.id);

  const createRes = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/categories`, {
    method: 'POST',
    headers: {
      Authorization: wpAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: categoryName }),
  });

  if (!createRes.ok) return null;
  const created = await createRes.json();
  return Number(created?.id || 0) || null;
}

async function uploadWpMedia(filePath: string, title: string): Promise<number | null> {
  const buffer = await readFile(filePath);
  const filename = path.basename(filePath);

  const response = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      Authorization: wpAuthHeader(),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'image/png',
    },
    body: buffer,
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`WP media upload failed ${response.status}: ${txt}`);
  }

  const media = await response.json();
  const mediaId = Number(media?.id || 0) || null;

  if (mediaId) {
    await fetch(`${WP_BASE_URL}/wp-json/wp/v2/media/${mediaId}`, {
      method: 'POST',
      headers: {
        Authorization: wpAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, alt_text: title }),
    }).catch(() => undefined);
  }

  return mediaId;
}

async function createWpPost(payload: GeneratedPost, source: FeedItem, featuredMediaId: number | null, categoryId: number | null): Promise<number> {
  const blocks = [
    `<p><em>Fuente analizada: <a href="${source.link}" target="_blank" rel="noopener noreferrer nofollow">${source.title}</a></em></p>`,
    payload.contentHtml,
  ];

  const body: Record<string, any> = {
    title: payload.title,
    excerpt: payload.excerpt,
    content: blocks.join('\n'),
    status: BLOG_STATUS,
    author: BLOG_AUTHOR_ID,
    slug: payload.title
      .normalize('NFD')
      .replace(/\p{Mn}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90),
    meta: {
      inforvel_auto_source_url: source.link,
      inforvel_auto_seo_keyword: payload.seoKeyword,
    },
  };

  if (featuredMediaId) body.featured_media = featuredMediaId;
  if (categoryId) body.categories = [categoryId];

  const response = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: wpAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`WP post create failed ${response.status}: ${txt}`);
  }

  const post = await response.json();
  return Number(post?.id || 0);
}

function validateConfig() {
  const missing: string[] = [];
  if (!WP_BASE_URL) missing.push('BLOG_WP_BASE_URL or NEXT_PUBLIC_WC_URL');
  if (!DRY_RUN) {
    if (!WP_USER) missing.push('BLOG_WP_USER');
    if (!WP_APP_PASSWORD) missing.push('BLOG_WP_APP_PASSWORD');
  }
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}

async function main() {
  validateConfig();

  const state = await loadState();
  const item = await pickSourceItem(state);

  if (!item) {
    console.log('[blog-autopublish] No eligible source item found.');
    return;
  }

  console.log('[blog-autopublish] Source selected:', item.title, item.link);

  const generated = await generatePost(item);
  if (DRY_RUN) {
    console.log('[blog-autopublish] DRY RUN: Post preview');
    console.log(JSON.stringify({
      title: generated.title,
      excerpt: generated.excerpt,
      source: item.link,
      status: BLOG_STATUS,
    }, null, 2));
    return;
  }

  const imagePath = await generateImageToFile(generated.imagePrompt).catch((error) => {
    console.error('[blog-autopublish] image generation failed:', error);
    return null;
  });

  let featuredMediaId: number | null = null;
  if (imagePath) {
    featuredMediaId = await uploadWpMedia(imagePath, generated.title).catch((error) => {
      console.error('[blog-autopublish] media upload failed:', error);
      return null;
    });
  }

  const categoryId = await ensureWpCategory(BLOG_CATEGORY_NAME).catch(() => null);
  const postId = await createWpPost(generated, item, featuredMediaId, categoryId);

  state.publishedSourceHashes.unshift(hashSource(item.link));
  state.publishedSourceHashes = Array.from(new Set(state.publishedSourceHashes)).slice(0, 500);
  await saveState(state);

  console.log(`[blog-autopublish] Published post ${postId} from source: ${item.link}`);
}

main().catch((error) => {
  console.error('[blog-autopublish] Fatal error:', error);
  process.exit(1);
});
