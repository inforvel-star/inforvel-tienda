import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const AVATARS_DIR = path.join(process.cwd(), 'storage', 'avatars');

function contentTypeForExtension(ext: string): string {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = String(params.filename || '');

  if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/.test(filename)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filePath = path.join(AVATARS_DIR, filename);

  try {
    const buffer = await readFile(filePath);
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypeForExtension(ext),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
