import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import { dogPhotos } from "./photos";

export async function deleteDog(ownerId: string, dogId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const dog = await tx.dog.findFirst({ where: { id: dogId, ownerId } });
        if (!dog) throw new HttpError("Perfil não encontrado.", 404);
        const urls = dogPhotos(dog);
        if (urls.length) {
          await tx.photoDeletion.createMany({
            data: urls.map((url) => ({ url })), skipDuplicates: true,
          });
        }
        // Likes, conversations, messages and reports follow the database cascades.
        await tx.dog.delete({ where: { id: dog.id } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 2) continue;
        throw new HttpError("Houve outra alteração ao mesmo tempo. Tente novamente.", 409);
      }
      throw error;
    }
  }
}
