import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkOrigin, failure, HttpError } from "@/lib/http";
import { db } from "@/lib/prisma";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const { dogId, reason } = z
      .object({
        dogId: z.string().min(1),
        reason: z
          .string()
          .trim()
          .min(5, "Descreva o motivo (mínimo de 5 caracteres).")
          .max(1000),
      })
      .parse(await request.json());
    const dog = await db.dog.findUnique({ where: { id: dogId } });
    if (!dog || dog.ownerId === user.id)
      throw new HttpError("Perfil indisponível.", 404);
    await db.report.upsert({
      where: { reporterId_dogId: { reporterId: user.id, dogId } },
      create: { reporterId: user.id, dogId, reason },
      update: { reason, status: "OPEN", reviewedAt: null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
