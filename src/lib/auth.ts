import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./prisma";
import { HttpError } from "./http";
const COOKIE = "petnamora_session";
const localSecret = randomBytes(48).toString("hex");
function secret() {
  const value = process.env.JWT_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production")
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  return localSecret;
}
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let sessionId: string;
  try {
    const payload = jwt.verify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.sid !== "string")
      return null;
    sessionId = payload.sid;
  } catch {
    return null;
  }
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      user: { select: { id: true, name: true, email: true, isAdmin: true, suspendedAt: true } },
    },
  });
  if (!session || session.expiresAt <= new Date() || session.user.suspendedAt)
    return null;
  const { id, name, email, isAdmin } = session.user;
  return { id, name, email, isAdmin };
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError("Entre na sua conta para continuar.", 401);
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new HttpError("Acesso exclusivo de administradores.", 403);
  return user;
}
export async function createSession(userId: string) {
  const session = await db.session.create({
    data: { userId, expiresAt: new Date(Date.now() + 7 * 86400000) },
  });
  const token = jwt.sign({ sid: session.id }, secret(), {
    algorithm: "HS256",
    expiresIn: "7d",
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
}
export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    let sessionId: string | undefined;
    try {
      const payload = jwt.verify(token, secret(), { algorithms: ["HS256"] });
      if (typeof payload !== "string" && typeof payload.sid === "string")
        sessionId = payload.sid;
    } catch {
      /* An invalid token is already unusable. */
    }
    if (sessionId) await db.session.deleteMany({ where: { id: sessionId } });
  }
  jar.delete(COOKIE);
}
