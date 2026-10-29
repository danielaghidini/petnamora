import { randomUUID } from "node:crypto";
import { HttpError } from "./http";
import { cloudflarePhotoUrl } from "./photo-urls";

interface CloudflareUploadResponse {
  success?: boolean;
  result?: { id?: string; variants?: string[] };
}

export async function deleteCloudflarePhoto(imageId: string) {
  // Only this app's UUID-based IDs may be removed from the shared account.
  cloudflarePhotoUrl(imageId);
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !token)
    throw new HttpError("A exclusão de fotos na Cloudflare ainda não está configurada.", 503);
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${encodeURIComponent(imageId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) },
    );
    const data = await response.json() as { success?: boolean; errors?: { code?: number }[] };
    // A retry after an interrupted response can encounter an already deleted image.
    if ((response.ok && data.success) || (response.status === 404 && data.errors?.some((error) => error.code === 5404))) return;
  } catch {
    throw new HttpError("Não conseguimos excluir a foto na Cloudflare. Tente novamente.", 502);
  }
  throw new HttpError("Não conseguimos excluir a foto na Cloudflare. Tente novamente.", 502);
}

export async function uploadCloudflarePhoto(
  bytes: Uint8Array,
  extension: "jpg" | "png" | "webp",
  ownerId: string,
) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !token)
    throw new HttpError("O envio de fotos ainda não está configurado.", 503);

  const imageId = `petnamora/${randomUUID()}`;
  let url: string;
  try {
    url = cloudflarePhotoUrl(imageId);
  } catch {
    throw new HttpError("O envio de fotos ainda não está configurado.", 503);
  }
  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array(bytes)], {
      type: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
    }),
    `${imageId.split("/")[1]}.${extension}`,
  );
  form.set("id", imageId);
  form.set("creator", `petnamora:${ownerId}`);
  form.set("metadata", JSON.stringify({ app: "petnamora" }));
  form.set("requireSignedURLs", "false");

  let response: Response;
  let data: CloudflareUploadResponse;
  try {
    response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: AbortSignal.timeout(20_000),
      },
    );
    data = (await response.json()) as CloudflareUploadResponse;
  } catch {
    throw new HttpError("Não conseguimos enviar a foto. Tente novamente.", 502);
  }
  if (
    !response.ok ||
    !data?.success ||
    data.result?.id !== imageId ||
    !Array.isArray(data.result.variants) ||
    !data.result.variants.includes(url)
  )
    throw new HttpError("Não conseguimos enviar a foto. Tente novamente.", 502);

  return url;
}
