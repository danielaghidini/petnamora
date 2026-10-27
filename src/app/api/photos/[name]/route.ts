import path from "node:path";
import { readFile } from "node:fs/promises";
import { uploadDirectory } from "@/lib/photos";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name))
    return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(uploadDirectory(), name));
    const type = name.endsWith(".jpg")
      ? "image/jpeg"
      : name.endsWith(".png")
        ? "image/png"
        : "image/webp";
    return new Response(bytes, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
