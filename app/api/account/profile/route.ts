import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
const AVATAR_META_KEY = 'inforvel_avatar_url';
const AVATARS_DIR = path.join(process.cwd(), 'storage', 'avatars');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function extensionForMime(mime: string): string | null {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return null;
}

async function saveUploadedAvatar(file: File): Promise<string> {
  const ext = extensionForMime(file.type);
  if (!ext) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('La imagen supera el tamaño máximo de 2MB.');
  }

  await mkdir(AVATARS_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const destination = path.join(AVATARS_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, buffer);
  return filename;
}

type AvatarMeta = { id?: number; url: string | null };

function extractAvatarMeta(metaData: any[]): AvatarMeta {
  const matches = Array.isArray(metaData)
    ? metaData.filter((m: any) => m?.key === AVATAR_META_KEY)
    : [];
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const value = matches[i]?.value;
    if (typeof value === 'string' && value.trim()) {
      return { id: matches[i]?.id, url: value.trim() };
    }
  }
  const last = matches[matches.length - 1];
  return { id: last?.id, url: null };
}

async function getCurrentAvatarMeta(customerId: number): Promise<AvatarMeta> {
  const customerRes = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${customerId}`, {
    headers: { Authorization: WC_AUTH },
    cache: 'no-store',
  });
  if (!customerRes.ok) return { url: null };
  const customer = await customerRes.json();
  return extractAvatarMeta(customer?.meta_data);
}

export async function PUT(request: NextRequest) {
  const rateLimitError = await checkRateLimit(request, 20, 60_000);
  if (rateLimitError) return rateLimitError;

  const auth = await authenticateRequest(request);
  if (!auth || !auth.customerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let avatarUrl: string | null = null;
  try {
    const formData = await request.formData();
    const fileValue = formData.get('avatar');
    const removeAvatar = formData.get('remove_avatar') === '1';

    if (!removeAvatar) {
      if (!(fileValue instanceof File)) {
        return NextResponse.json(
          { error: 'Debes seleccionar una imagen.' },
          { status: 400 }
        );
      }

      const filename = await saveUploadedAvatar(fileValue);
      avatarUrl = `/api/account/avatar/${filename}`;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo procesar la imagen.' },
      { status: 400 }
    );
  }

  const previousAvatar = await getCurrentAvatarMeta(auth.customerId);
  const metadataPayload: Record<string, any> = { key: AVATAR_META_KEY, value: avatarUrl || '' };
  if (typeof previousAvatar.id === 'number') {
    metadataPayload.id = previousAvatar.id;
  }

  const updateRes = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${auth.customerId}`, {
    method: 'PUT',
    headers: {
      Authorization: WC_AUTH,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meta_data: [metadataPayload],
    }),
    cache: 'no-store',
  });

  if (!updateRes.ok) {
    const errorData = await updateRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: errorData?.message || 'No se pudo actualizar el perfil' },
      { status: updateRes.status }
    );
  }

  if (previousAvatar.url?.includes('/api/account/avatar/')) {
    const previousFile = previousAvatar.url.split('/api/account/avatar/')[1];
    if (previousFile && !avatarUrl?.endsWith(previousFile)) {
      const previousPath = path.join(AVATARS_DIR, previousFile);
      await unlink(previousPath).catch(() => undefined);
    }
  }

  return NextResponse.json({ success: true, avatar_url: avatarUrl });
}
