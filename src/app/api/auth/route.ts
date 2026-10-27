import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { createSession, currentUser, endSession } from "@/lib/auth";
import { checkOrigin, failure, HttpError } from "@/lib/http";

const inputSchema = z.object({
  action: z.enum(["login", "register"]),
  name: z.string().trim().min(2, "Informe seu nome.").max(80).optional(),
  email: z
    .email("Informe um e-mail válido.")
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(72)
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= 72,
      "Essa senha ficou comprida demais. Tente uma um pouco menor.",
    ),
});
// Bounded, per-process protection for the single-instance MVP. Use shared storage before scaling.
const attempts = new Map<string, { count: number; resetAt: number }>();
function throttle(email: string) {
  const now = Date.now();
  for (const [key, entry] of attempts)
    if (entry.resetAt < now) attempts.delete(key);
  if (attempts.size >= 5000)
    throw new HttpError("Tente novamente em alguns minutos.", 429);
  const entry = attempts.get(email) || { count: 0, resetAt: now + 15 * 60000 };
  entry.count++;
  attempts.set(email, entry);
  if (entry.count > 15)
    throw new HttpError(
      "Muitas tentativas. Tente novamente em 15 minutos.",
      429,
    );
}
export async function GET() {
  try {
    return NextResponse.json({ user: await currentUser() });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = inputSchema.parse(await request.json());
    throttle(input.email);
    let user = await db.user.findUnique({ where: { email: input.email } });
    if (input.action === "register") {
      if (!input.name) throw new HttpError("Informe seu nome.");
      if (user)
        throw new HttpError(
          "Não foi possível cadastrar este e-mail. Se já tem conta, entre.",
          409,
        );
      user = await db.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: await bcrypt.hash(input.password, 12),
        },
      });
    } else if (
      !user ||
      !(await bcrypt.compare(input.password, user.passwordHash))
    ) {
      throw new HttpError("Ops, o e-mail ou a senha não conferem.", 401);
    }
    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return failure(new HttpError("Este e-mail já está cadastrado.", 409));
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    await endSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
