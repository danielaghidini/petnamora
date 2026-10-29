import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import { z } from "zod";
import { DOG_BREEDS, OTHER_BREED, breedNames } from "./breeds";

const discoverPageSize = 12;
const discoverCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.string().min(1).max(128),
});

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
  photoUrls: true,
  pedigree: true,
  vaccinated: true,
  healthTests: true,
  neutered: true,
  active: true,
} as const;

// Moderation is independent of the availability declared by the owner.
export const allowedDog = {
  blockedAt: null,
  owner: { suspendedAt: null },
} as const;

export async function discover(params: URLSearchParams, userId?: string) {
  const where: Prisma.DogWhereInput = { ...allowedDog, active: true, neutered: false };
  const breed = params.get("breed")?.trim();
  const breeds = [...new Set(params.getAll("breeds").map((value) => value.trim()).filter(Boolean))];
  const city = params.get("city")?.trim();
  const sex = params.get("sex");
  const size = params.get("size");
  if (breeds.length) {
    const selectedBreeds = breeds.filter((value) => value !== OTHER_BREED);
    const options: Prisma.DogWhereInput[] = [];
    if (selectedBreeds.length) options.push({ breed: { in: breedNames(selectedBreeds), mode: "insensitive" } });
    if (breeds.includes(OTHER_BREED)) {
      options.push({ NOT: { breed: { in: breedNames(DOG_BREEDS), mode: "insensitive" } } });
    }
    // Keep the breed alternatives independent of the pagination cursor's OR.
    where.AND = [{ OR: options }];
  } else if (breed) where.breed = { contains: breed, mode: "insensitive" };
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (sex === "MALE" || sex === "FEMALE") where.sex = sex;
  if (size && ["Pequeno", "Médio", "Grande"].includes(size)) where.size = size;
  if (params.get("pedigree") === "true") where.pedigree = true;
  if (userId) {
    where.ownerId = { not: userId };
    where.reports = { none: { reporterId: userId } };
  }
  const cursor = params.get("cursor");
  if (cursor !== null) {
    let position: z.infer<typeof discoverCursorSchema>;
    try {
      if (cursor.length > 512) throw new Error("Invalid cursor");
      position = discoverCursorSchema.parse(
        JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
      );
    } catch {
      throw new HttpError("Não foi possível continuar a busca. Faça uma nova busca.");
    }
    const createdAt = new Date(position.createdAt);
    where.OR = [
      { createdAt: { lt: createdAt } },
      { createdAt, id: { lt: position.id } },
    ];
  }
  const results = await db.dog.findMany({
    where,
    select: { ...publicDogFields, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: discoverPageSize + 1,
  });
  const page = results.slice(0, discoverPageSize);
  const last = page.at(-1);
  return {
    dogs: page.map((dog) => {
      const { createdAt, ...profile } = dog;
      void createdAt;
      return profile;
    }),
    nextCursor: results.length > discoverPageSize && last
      ? Buffer.from(JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id })).toString("base64url")
      : null,
  };
}

async function eligiblePair(tx: Prisma.TransactionClient, userId: string, fromId: string, toId: string, oppositeSex: boolean) {
  if (fromId === toId) throw new HttpError("Escolha outro cachorro.");
  const [from, to] = await Promise.all([
    tx.dog.findFirst({ where: { id: fromId, ...allowedDog } }),
    tx.dog.findFirst({ where: { id: toId, ...allowedDog } }),
  ]);
  if (!from || from.ownerId !== userId) throw new HttpError("Perfil não autorizado.", 403);
  if (!to || !to.active) throw new HttpError("Perfil indisponível.", 404);
  if (to.ownerId === userId || (oppositeSex && from.sex === to.sex))
    throw new HttpError(oppositeSex
      ? "Para esse namorinho, escolha um cachorro do sexo oposto e de outra família."
      : "Escolha um cachorro de outra família para conversar.");
  if (from.neutered || to.neutered || !from.active)
    throw new HttpError("Os dois perfis precisam estar ativos e disponíveis para cruzamento.");
  const reported = await tx.report.findFirst({
    where: { OR: [{ reporterId: userId, dogId: toId }, { reporterId: to.ownerId, dogId: fromId }] },
  });
  if (reported) throw new HttpError("Esse contato não está disponível.", 403);
}

export const conversationInclude = {
  dogA: { select: publicDogFields },
  dogB: { select: publicDogFields },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1, select: { text: true, createdAt: true } },
} as const;

export async function openConversation(userId: string, fromId: string, toId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        await eligiblePair(tx, userId, fromId, toId, false);
        const [dogAId, dogBId] = [fromId, toId].sort();
        return tx.match.upsert({
          where: { dogAId_dogBId: { dogAId, dogBId } },
          create: { dogAId, dogBId, isMatch: false },
          update: {},
          include: conversationInclude,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code) && attempt < 2) continue;
      throw error;
    }
  }
  throw new HttpError("Não foi possível abrir a conversa. Tente novamente.", 409);
}

export async function likeDog(userId: string, fromId: string, toId: string) {
  // Serializable isolation makes simultaneous reciprocal likes create exactly one match.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          await eligiblePair(tx, userId, fromId, toId, true);
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
            create: { dogAId, dogBId, isMatch: true },
            update: { isMatch: true },
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
  const allowed = await db.dog.count({
    where: { id: { in: [match.dogAId, match.dogBId] }, ...allowedDog },
  });
  if (allowed !== 2) throw new HttpError("Conversa indisponível.", 403);
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
