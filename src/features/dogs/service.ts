import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { HttpError } from "@/lib/http";

export const publicDogFields = {
  id: true,
  ownerId: true,
  name: true,
  breed: true,
  sex: true,
  ageMonths: true,
  size: true,
  city: true,
  state: true,
  bio: true,
  photoUrl: true,
  pedigree: true,
  vaccinated: true,
  healthTests: true,
  neutered: true,
  active: true,
  demo: true,
} as const;

export async function discover(params: URLSearchParams, userId?: string) {
  const where: Prisma.DogWhereInput = { active: true, neutered: false };
  const breed = params.get("breed")?.trim();
  const city = params.get("city")?.trim();
  const sex = params.get("sex");
  const size = params.get("size");
  if (breed) where.breed = { contains: breed, mode: "insensitive" };
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (sex === "MALE" || sex === "FEMALE") where.sex = sex;
  if (size && ["Pequeno", "Médio", "Grande"].includes(size)) where.size = size;
  if (params.get("pedigree") === "true") where.pedigree = true;
  if (userId) {
    where.ownerId = { not: userId };
    where.reports = { none: { reporterId: userId } };
    // Examples remain useful for a new installation, but never mix into a live community.
    const liveCount = await db.dog.count({
      where: { active: true, demo: false, ownerId: { not: userId } },
    });
    if (liveCount > 0) where.demo = false;
  }
  return db.dog.findMany({
    where,
    select: publicDogFields,
    orderBy: [{ demo: "asc" }, { createdAt: "desc" }],
    take: 60,
  });
}

export async function likeDog(userId: string, fromId: string, toId: string) {
  if (fromId === toId) throw new HttpError("Escolha outro cachorro.");
  // Serializable isolation makes simultaneous reciprocal likes create exactly one match.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const [from, to] = await Promise.all([
            tx.dog.findUnique({ where: { id: fromId } }),
            tx.dog.findUnique({ where: { id: toId } }),
          ]);
          if (!from || from.ownerId !== userId)
            throw new HttpError("Perfil não autorizado.", 403);
          if (!to || !to.active)
            throw new HttpError("Perfil indisponível.", 404);
          if (from.demo || to.demo)
            throw new HttpError(
              "Esse fofinho é só um exemplo. Os corações só valem entre cachorros cadastrados de verdade.",
            );
          if (to.ownerId === userId || from.sex === to.sex)
            throw new HttpError(
              "Para esse namorinho, escolha um cachorro do sexo oposto e de outra família.",
            );
          if (from.neutered || to.neutered || !from.active)
            throw new HttpError(
              "Para esse namorinho, os dois cachorros precisam ter perfis ativos e estar disponíveis para cruzamento.",
            );
          const reported = await tx.report.findFirst({
            where: {
              OR: [
                { reporterId: userId, dogId: toId },
                { reporterId: to.ownerId, dogId: fromId },
              ],
            },
          });
          if (reported)
            throw new HttpError("Esse namorinho não está disponível.", 403);
          await tx.like.upsert({
            where: { fromId_toId: { fromId, toId } },
            create: { fromId, toId },
            update: {},
          });
          const reciprocal = await tx.like.findUnique({
            where: { fromId_toId: { fromId: toId, toId: fromId } },
          });
          if (!reciprocal) return { matched: false, matchId: null };
          const [dogAId, dogBId] = [fromId, toId].sort();
          const match = await tx.match.upsert({
            where: { dogAId_dogBId: { dogAId, dogBId } },
            create: { dogAId, dogBId },
            update: {},
          });
          return { matched: true, matchId: match.id };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code) &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
  throw new HttpError("Ops, o coraçãozinho não foi. Tente de novo.", 409);
}

export async function accessibleMatch(matchId: string, userId: string) {
  const match = await db.match.findFirst({
    where: {
      id: matchId,
      OR: [{ dogA: { ownerId: userId } }, { dogB: { ownerId: userId } }],
    },
    include: { dogA: true, dogB: true },
  });
  if (!match) throw new HttpError("Conversa não encontrada.", 404);
  const reported = await db.report.findFirst({
    where: {
      OR: [
        { reporterId: match.dogA.ownerId, dogId: match.dogBId },
        { reporterId: match.dogB.ownerId, dogId: match.dogAId },
      ],
    },
  });
  if (reported) throw new HttpError("Conversa indisponível.", 403);
  return match;
}
