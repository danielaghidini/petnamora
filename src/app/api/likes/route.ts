import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkOrigin, failure, HttpError } from "@/lib/http";
import { db } from "@/lib/prisma";
import { likeDog, publicDogFields } from "@/features/dogs/service";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const fromId = new URL(request.url).searchParams.get("fromId");
    if (
      fromId &&
      !(await db.dog.findFirst({
        where: { id: fromId, ownerId: user.id },
        select: { id: true },
      }))
    )
      throw new HttpError("Perfil não autorizado.", 403);
    const likes = await db.like.findMany({
      where: {
        ...(fromId ? { fromId } : {}),
        from: { ownerId: user.id },
        to: { reports: { none: { reporterId: user.id } } },
      },
      select: { to: { select: publicDogFields } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ dogs: likes.map((like) => like.to) });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({ fromId: z.string().min(1), toId: z.string().min(1) })
      .parse(await request.json());
    return NextResponse.json(await likeDog(user.id, input.fromId, input.toId));
  } catch (error) {
    return failure(error);
  }
}
