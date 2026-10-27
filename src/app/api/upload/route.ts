import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { checkOrigin, failure, HttpError } from "@/lib/http";
import { imageType, uploadDirectory } from "@/lib/photos";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser();
    if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024)
      throw new HttpError("Use uma foto de até 5 MB.", 413);
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024)
      throw new HttpError("Envie uma foto JPG, PNG ou WebP de até 5 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = imageType(bytes);
    if (!extension)
      throw new HttpError("Formato inválido. Use JPG, PNG ou WebP.");
    const name = `${randomUUID()}.${extension}`;
    await mkdir(uploadDirectory(), { recursive: true });
    await writeFile(path.join(uploadDirectory(), name), bytes, { flag: "wx" });
    return NextResponse.json({ url: `/api/photos/${name}` }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
