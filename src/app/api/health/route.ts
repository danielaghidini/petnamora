import { db } from "@/lib/prisma";
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", service: "pet-namora" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
