import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { failure } from "@/lib/http";
import { db } from "@/lib/prisma";
import { allowedDog, publicDogFields } from "@/features/dogs/service";
export async function GET() {
  try {
    const user = await requireUser();
    const matches = await db.match.findMany({
      where: {
        OR: [{ dogA: { ownerId: user.id } }, { dogB: { ownerId: user.id } }],
        dogA: { ...allowedDog, reports: { none: { reporterId: user.id } } },
        dogB: { ...allowedDog, reports: { none: { reporterId: user.id } } },
      },
      include: {
        dogA: { select: publicDogFields },
        dogB: { select: publicDogFields },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { text: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ matches });
  } catch (error) {
    return failure(error);
  }
}
