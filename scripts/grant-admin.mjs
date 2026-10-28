import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
const emailArg = args.find((arg) => arg.startsWith("--email="));
const email = emailArg?.slice("--email=".length).trim().toLowerCase();
if (!email || args.length !== 1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Uso: npm run admin:grant -- --email=seu-email@dominio.com\nCadastre a conta no Pet Namora antes de conceder acesso. O comando usa o DATABASE_URL do ambiente atual.");
  process.exitCode = 1;
} else {
  const db = new PrismaClient();
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email } });
      if (!user) throw new Error("Conta não encontrada. Cadastre esse e-mail no Pet Namora primeiro.");
      if (user.suspendedAt) throw new Error("A conta está suspensa. Reative-a antes de conceder acesso.");
      if (user.isAdmin) { console.log("Esta conta já é administradora."); return; }
      await tx.user.update({ where: { id: user.id }, data: { isAdmin: true } });
      await tx.adminAction.create({ data: {
        actorId: user.id, targetId: user.id, action: "ADMIN_GRANTED",
        reason: "Acesso concedido pelo operador do sistema via comando admin:grant.",
      } });
      console.log(`Acesso de administrador concedido a ${email}. Entre em /admin com a senha da conta.`);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Não foi possível conceder o acesso.");
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
