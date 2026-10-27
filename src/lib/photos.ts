import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { uploadCloudflarePhoto } from "./cloudflare-images";
import { HttpError } from "./http";

export async function savePhoto(
  bytes: Uint8Array,
  extension: "jpg" | "png" | "webp",
  ownerId: string,
) {
  const storage =
    process.env.PHOTO_STORAGE ||
    (process.env.NODE_ENV === "production" ? "cloudflare" : "local");
  if (storage === "cloudflare")
    return uploadCloudflarePhoto(bytes, extension, ownerId);
  if (storage !== "local")
    throw new HttpError("O envio de fotos ainda não está configurado.", 503);
  const name = `${randomUUID()}.${extension}`;
  await mkdir(uploadDirectory(), { recursive: true });
  await writeFile(path.join(uploadDirectory(), name), bytes, { flag: "wx" });
  return `/api/photos/${name}`;
}

export function uploadDirectory() {
  return path.resolve(
    process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"),
  );
}
export function imageType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length >= 8 &&
    Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    return "png";
  if (
    Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP"
  )
    return "webp";
  return null;
}
