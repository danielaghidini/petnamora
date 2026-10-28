import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { checkOrigin, failure } from "@/lib/http";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { allowedDog, conversationInclude, openConversation } from "@/features/dogs/service";
export async function GET() {
  try {
    const user = await requireUser();
    const matches = await db.match.findMany({
      where: {
        OR: [{ dogA: { ownerId: user.id } }, { dogB: { ownerId: user.id } }],
        dogA: { ...allowedDog, reports: { none: { reporterId: user.id } } },
        dogB: { ...allowedDog, reports: { none: { reporterId: user.id } } },
        AND: [{ OR: [{ isMatch: true }, { messages: { some: {} } }] }],
      },
      include: conversationInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const reports = matches.length ? await db.report.findMany({
      where: { OR: matches.flatMap((match) => [
        { reporterId: match.dogA.ownerId, dogId: match.dogB.id },
        { reporterId: match.dogB.ownerId, dogId: match.dogA.id },
      ]) },
      select: { reporterId: true, dogId: true },
    }) : [];
    const blocked = new Set(reports.map((report) => `${report.reporterId}:${report.dogId}`));
    return NextResponse.json({ matches: matches.filter((match) =>
      !blocked.has(`${match.dogA.ownerId}:${match.dogB.id}`) && !blocked.has(`${match.dogB.ownerId}:${match.dogA.id}`),
    ) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = z.object({ fromId: z.string().min(1), toId: z.string().min(1) }).parse(await request.json());
    const match = await openConversation(user.id, input.fromId, input.toId);
    return NextResponse.json({ match });
  } catch (error) {
    return failure(error);
  }
}
