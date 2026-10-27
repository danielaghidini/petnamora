import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkOrigin, failure, HttpError } from "@/lib/http";
import { db } from "@/lib/prisma";
import { accessibleMatch } from "@/features/dogs/service";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const matchId = new URL(request.url).searchParams.get("matchId");
    if (!matchId) throw new HttpError("Escolha uma conversa.");
    await accessibleMatch(matchId, user.id);
    const messages = await db.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({
        matchId: z.string().min(1),
        text: z.string().trim().min(1).max(2000, "Use até 2.000 caracteres."),
      })
      .parse(await request.json());
    await accessibleMatch(input.matchId, user.id);
    const message = await db.message.create({
      data: { ...input, senderId: user.id },
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
