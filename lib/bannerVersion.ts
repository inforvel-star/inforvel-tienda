// Sube este número a mano cada vez que sustituyas una imagen en
// /public/banners/** o /public/categorias/** manteniendo el mismo nombre de
// archivo, para que el navegador no siga sirviendo la versión antigua desde
// caché. (next.config.js tiene images.unoptimized = true, así que no hay
// hash automático de Next.js que resuelva esto por sí solo.)
export const BANNER_ASSET_VERSION = 6;

export function versionedBannerSrc(src: string): string {
  return `${src}?v=${BANNER_ASSET_VERSION}`;
}
