import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import type { AdminChange } from "./validation";

export const adminUserFields = {
  id: true, name: true, email: true, isAdmin: true, suspendedAt: true, createdAt: true,
} as const;
export const adminReportFields = {
  id: true, reason: true, status: true, createdAt: true, reviewedAt: true,
  reporter: { select: { name: true, email: true } },
  dog: {
    select: {
      id: true, name: true, breed: true, bio: true, photoUrl: true, blockedAt: true,
      owner: { select: adminUserFields },
    },
  },
} as const;

export async function adminOverview() {
  const [users, dogs, matches, openReports, suspendedUsers, blockedDogs, recentReports] = await Promise.all([
    db.user.count(), db.dog.count(), db.match.count(),
    db.report.count({ where: { status: "OPEN" } }),
    db.user.count({ where: { suspendedAt: { not: null } } }),
    db.dog.count({ where: { blockedAt: { not: null } } }),
    db.report.findMany({ where: { status: "OPEN" }, select: adminReportFields, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5 }),
  ]);
  return { users, dogs, matches, openReports, suspendedUsers, blockedDogs, recentReports };
}

export async function applyAdminChange(actorId: string, input: AdminChange) {
  // Recheck permissions inside the transaction; write the audit record atomically.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const actor = await tx.user.findUnique({ where: { id: actorId }, select: adminUserFields });
        if (!actor?.isAdmin || actor.suspendedAt)
          throw new HttpError("Acesso exclusivo de administradores.", 403);
        let action: string;
        if (input.kind === "user") {
          const target = await tx.user.findUnique({ where: { id: input.id }, select: adminUserFields });
          if (!target) throw new HttpError("Usuário não encontrado.", 404);
          if (target.isAdmin || target.id === actorId)
            throw new HttpError("Contas de administradores não podem ser suspensas pelo painel.", 403);
          if (Boolean(target.suspendedAt) !== input.expected || input.value === input.expected)
            throw new HttpError("A conta mudou. Atualize o painel antes de continuar.", 409);
          await tx.user.update({ where: { id: input.id }, data: { suspendedAt: input.value ? new Date() : null } });
          if (input.value) await tx.session.deleteMany({ where: { userId: input.id } });
          action = input.value ? "USER_SUSPENDED" : "USER_RESTORED";
        } else if (input.kind === "dog") {
          const target = await tx.dog.findUnique({ where: { id: input.id }, select: { blockedAt: true } });
          if (!target) throw new HttpError("Perfil não encontrado.", 404);
          if (Boolean(target.blockedAt) !== input.expected || input.value === input.expected)
            throw new HttpError("O perfil mudou. Atualize o painel antes de continuar.", 409);
          await tx.dog.update({ where: { id: input.id }, data: { blockedAt: input.value ? new Date() : null } });
          action = input.value ? "DOG_BLOCKED" : "DOG_RESTORED";
        } else {
          const target = await tx.report.findUnique({ where: { id: input.id }, select: { status: true } });
          if (!target) throw new HttpError("Denúncia não encontrada.", 404);
          if (target.status !== input.expected || input.value === input.expected)
            throw new HttpError("A denúncia mudou. Atualize o painel antes de continuar.", 409);
          await tx.report.update({
            where: { id: input.id },
            data: { status: input.value, reviewedAt: input.value === "OPEN" ? null : new Date() },
          });
          action = `REPORT_${input.value}`;
        }
        await tx.adminAction.create({ data: { actorId, action, targetId: input.id, reason: input.reason } });
        return { ok: true };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 2) continue;
        throw new HttpError("Houve outra alteração ao mesmo tempo. Atualize o painel e tente novamente.", 409);
      }
      throw error;
    }
  }
}
