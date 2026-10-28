import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const migration = await readFile(new URL("../../prisma/migrations/20261028230000_direct_conversations/migration.sql", import.meta.url), "utf8");

test("direct conversations preserve existing matches and keep the previous writer compatible", async () => {
  const db = new PrismaClient();
  const rollback = new Error("rollback direct-conversation verification schema");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const schema = `direct_verify_${randomUUID().replaceAll("-", "")}`;
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE "Match" (id TEXT PRIMARY KEY, "dogAId" TEXT NOT NULL, "dogBId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)');
      await tx.$executeRawUnsafe('CREATE TABLE "Message" (id TEXT PRIMARY KEY, "matchId" TEXT REFERENCES "Match"(id), text TEXT NOT NULL)');
      await tx.$executeRawUnsafe(`INSERT INTO "Match" (id, "dogAId", "dogBId") VALUES ('existing', 'a', 'b')`);
      await tx.$executeRawUnsafe(`INSERT INTO "Message" (id, "matchId", text) VALUES ('message', 'existing', 'Preserve this message')`);
      const before = await tx.$queryRawUnsafe('SELECT to_jsonb(m) AS row FROM "Match" m');
      await tx.$executeRawUnsafe(migration);
      assert.deepEqual(await tx.$queryRawUnsafe('SELECT to_jsonb(m) - \'isMatch\' AS row FROM "Match" m'), before);
      assert.deepEqual(await tx.$queryRawUnsafe('SELECT "isMatch" FROM "Match"'), [{ isMatch: true }]);
      await tx.$executeRawUnsafe(`INSERT INTO "Match" (id, "dogAId", "dogBId") VALUES ('previous-writer', 'a', 'c')`);
      await tx.$executeRawUnsafe(`INSERT INTO "Match" (id, "dogAId", "dogBId", "isMatch") VALUES ('direct', 'b', 'c', false)`);
      assert.deepEqual(await tx.$queryRawUnsafe('SELECT id, "isMatch" FROM "Match" ORDER BY id'), [
        { id: "direct", isMatch: false }, { id: "existing", isMatch: true }, { id: "previous-writer", isMatch: true },
      ]);
      assert.deepEqual(await tx.$queryRawUnsafe('SELECT text FROM "Message"'), [{ text: "Preserve this message" }]);
      throw rollback;
    }, { timeout: 30000 }), (error) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
