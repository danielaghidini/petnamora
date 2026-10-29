import { unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/prisma";
import { deleteCloudflarePhoto } from "@/lib/cloudflare-images";
import { cloudflarePhotoIdFromUrl, isPhotoUrl } from "@/lib/photo-urls";
import { uploadDirectory } from "@/lib/photos";

export async function cleanDeletedAccountPhotos() {
  const jobs = await db.photoDeletion.findMany({ orderBy: { createdAt: "asc" }, take: 50 });
  // Bound the request duration even when storage is unavailable.
  for (let offset = 0; offset < jobs.length; offset += 10) {
    const results = await Promise.allSettled(jobs.slice(offset, offset + 10).map(async (job) => {
      const references = await db.dog.count({ where: { OR: [{ photoUrl: job.url }, { photoUrls: { has: job.url } }] } });
      if (!references) {
        const imageId = cloudflarePhotoIdFromUrl(job.url);
        if (imageId) {
          await deleteCloudflarePhoto(imageId);
        } else if (job.url.startsWith("/api/photos/") && isPhotoUrl(job.url)) {
          await unlink(path.join(uploadDirectory(), path.basename(job.url))).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") throw error;
          });
        } else {
          throw new Error("Foto fora do armazenamento configurado.");
        }
      }
      await db.photoDeletion.deleteMany({ where: { id: job.id } });
    }));
    if (results.some((result) => result.status === "rejected")) break;
  }
  return db.photoDeletion.count();
}
