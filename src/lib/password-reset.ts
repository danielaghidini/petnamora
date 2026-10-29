import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./prisma";
import { HttpError } from "./http";
import { passwordResetEmailConfig, sendPasswordResetEmail } from "./password-reset-email";

export const PASSWORD_RESET_MESSAGE = "Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Verifique também a caixa de spam.";
const invalidLink = () => new HttpError("Este link é inválido ou expirou. Peça um novo e-mail de recuperação.");
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

async function throttle(email: string) {
  // Atomic and shared across workers; the same limits apply to absent accounts.
  const rows = await db.$queryRaw<{ emailHash: string }[]>`
    INSERT INTO "PasswordResetRequest" ("emailHash", "windowStart", "requestedAt", "attempts")
    VALUES (${digest(email)}, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), 1)
    ON CONFLICT ("emailHash") DO UPDATE SET
      "attempts" = CASE WHEN "PasswordResetRequest"."windowStart" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '1 hour'
        THEN 1 ELSE "PasswordResetRequest"."attempts" + 1 END,
      "windowStart" = CASE WHEN "PasswordResetRequest"."windowStart" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '1 hour'
        THEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') ELSE "PasswordResetRequest"."windowStart" END,
      "requestedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
    WHERE "PasswordResetRequest"."requestedAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '1 minute'
      AND ("PasswordResetRequest"."windowStart" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '1 hour'
        OR "PasswordResetRequest"."attempts" < 5)
    RETURNING "emailHash"
  `;
  if (!rows.length) throw new HttpError("Aguarde um minuto antes de pedir outro link. O limite é de 5 pedidos por hora.", 429);
}

export async function requestPasswordReset(email: string, config: ReturnType<typeof passwordResetEmailConfig>) {
  await throttle(email);
  await db.passwordResetToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await db.passwordResetRequest.deleteMany({ where: { requestedAt: { lt: new Date(Date.now() - 86400000) } } });
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.suspendedAt) return;
  const token = randomBytes(32).toString("hex");
  const tokenHash = digest(token);
  const data = { tokenHash, email, expiresAt: new Date(Date.now() + 3600000) };
  await db.passwordResetToken.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  try {
    await sendPasswordResetEmail(config, email, token);
  } catch (error) {
    // Remove only this failed attempt; never remove a newer token.
    await db.passwordResetToken.deleteMany({ where: { tokenHash } });
    throw error;
  }
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = digest(token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt <= new Date()) throw invalidLink();
  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction(async (tx) => {
    // Same lock order as session creation. Concurrent submissions consume once.
    const [user] = await tx.$queryRaw<{ email: string; suspendedAt: Date | null }[]>`
      SELECT "email", "suspendedAt" FROM "User" WHERE "id" = ${record.userId} FOR UPDATE
    `;
    if (!user || user.suspendedAt || user.email !== record.email) throw invalidLink();
    const consumed = await tx.passwordResetToken.deleteMany({ where: { tokenHash, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) throw invalidLink();
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: record.userId } });
  });
}
