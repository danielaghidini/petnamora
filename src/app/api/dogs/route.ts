import { NextResponse } from "next/server";
import { currentUser, requireUser } from "@/lib/auth";
import { checkOrigin, failure, HttpError } from "@/lib/http";
import { db } from "@/lib/prisma";
import { discover, publicDogFields } from "@/features/dogs/service";
import { dogSchema } from "@/features/dogs/validation";
import { photoData } from "@/features/dogs/photos";
import { z } from "zod";
import { deleteDog } from "@/features/dogs/delete";
import { cleanDeletedPhotos } from "@/lib/photo-cleanup";
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    const params = new URL(request.url).searchParams;
    if (params.get("mine") === "true") {
      if (!user) throw new HttpError("Entre na sua conta.", 401);
      return NextResponse.json({
        dogs: await db.dog.findMany({
          where: { ownerId: user.id },
          select: publicDogFields,
          orderBy: { createdAt: "asc" },
        }),
      });
    }
    return NextResponse.json(await discover(params, user?.id));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = dogSchema.parse(await request.json());
    if (input.neutered === true)
      throw new HttpError("O cadastro é destinado a cachorros disponíveis para cruzamento.");
    if ((await db.dog.count({ where: { ownerId: user.id } })) >= 5)
      throw new HttpError("Sua turminha pode ter até 5 cachorros por aqui.");
    const dog = await db.dog.create({
      data: { ...input, ...photoData(input), ownerId: user.id },
      select: publicDogFields,
    });
    return NextResponse.json({ dog }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const body = await request.json();
    if (typeof body.id !== "string") throw new HttpError("Informe o perfil.");
    const existing = await db.dog.findFirst({
      where: { id: body.id, ownerId: user.id },
    });
    if (!existing) throw new HttpError("Perfil não encontrado.", 404);
    // The retired field must never re-enable an existing neutered profile.
    const input = dogSchema.omit({ neutered: true }).parse(body);
    const dog = await db.dog.update({
      where: { id: existing.id },
      data: { ...input, ...photoData(input, existing) },
      select: publicDogFields,
    });
    return NextResponse.json({ dog });
  } catch (error) {
    return failure(error);
  }
}

const deleteDogSchema = z.object({ id: z.string().trim().min(1).max(100) }).strict();

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const { id } = deleteDogSchema.parse(await request.json());
    await deleteDog(user.id, id);
    try {
      await cleanDeletedPhotos();
    } catch {
      // The profile is already deleted; queued photos can be retried by an admin.
      console.error("Pet Namora: limpeza de fotos pendente após excluir cachorro.");
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
