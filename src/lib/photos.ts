/** Accept only canonical files in this owner's folder, never URL traversal or another origin. */
export function ownedPhotoPath(url: unknown, owner: string, base = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  if (typeof url !== "string" || !base) return null;
  const prefix = `${base.replace(/\/$/, "")}/storage/v1/object/public/product-photos/${owner}/`;
  if (!url.startsWith(prefix)) return null;
  const file = url.slice(prefix.length);
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(file)) return null;
  return `${owner}/${file}`;
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
