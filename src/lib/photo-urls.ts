const localPhoto = /^\/api\/photos\/[a-f0-9-]+\.(jpg|png|webp)$/;
const cloudflarePhotoId = /^petnamora\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export function cloudflarePhotoUrl(imageId: string) {
  const accountHash = process.env.CLOUDFLARE_ACCOUNT_HASH?.trim();
  if (!accountHash || !/^[A-Za-z0-9_-]+$/.test(accountHash))
    throw new Error("Configure CLOUDFLARE_ACCOUNT_HASH para as fotos.");
  if (!cloudflarePhotoId.test(imageId))
    throw new Error("Identificador de foto inválido.");
  return `https://imagedelivery.net/${accountHash}/${imageId}/public`;
}

export function isPhotoUrl(value: string) {
  if (localPhoto.test(value)) return true;
  try {
    const url = new URL(value);
    const imageId = url.pathname.split("/").slice(2, 4).join("/");
    return value === cloudflarePhotoUrl(imageId);
  } catch {
    return false;
  }
}
