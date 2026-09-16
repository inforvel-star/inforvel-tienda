import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type AvatarMap = Record<string, string>;

const STORE_DIR = path.join(process.cwd(), 'storage');
const STORE_FILE = path.join(STORE_DIR, 'avatars-map.json');

async function readMap(): Promise<AvatarMap> {
  try {
    const raw = await readFile(STORE_FILE, 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

async function writeMap(map: AvatarMap): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(map, null, 2), 'utf8');
}

export async function getAvatarForCustomer(customerId: number | null): Promise<string | null> {
  if (!customerId) return null;
  const map = await readMap();
  const value = map[String(customerId)];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function setAvatarForCustomer(customerId: number, avatarUrl: string | null): Promise<void> {
  const map = await readMap();
  const key = String(customerId);
  if (avatarUrl && avatarUrl.trim()) {
    map[key] = avatarUrl.trim();
  } else {
    delete map[key];
  }
  await writeMap(map);
}
