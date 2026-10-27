import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const initial = await readFile(new URL("../../prisma/migrations/20261027150000_initial/migration.sql", import.meta.url), "utf8");
const cleanup = await readFile(new URL("../../prisma/migrations/20261027200000_remove_demo_profiles/migration.sql", import.meta.url), "utf8");

// Run the actual migration SQL inside an isolated, rolled-back schema.
// The migration files here contain no procedural bodies or semicolons in strings.
async function sql(tx, source) {
  for (const statement of source.replace(/--[^\n]*/g, "").split(";")) {
    const command = statement.trim();
    if (command && !["BEGIN", "COMMIT"].includes(command))
      await tx.$executeRawUnsafe(command);
  }
}

for (const keepSeedOwner of [false, true]) {
  test(`cleanup preserves real data${keepSeedOwner ? " including real dogs owned by the former seed account" : " and removes the empty seed account"}`, async () => {
    const db = new PrismaClient();
    const rollback = new Error("rollback verification schema");
    try {
      await assert.rejects(db.$transaction(async (tx) => {
        const schema = `verify_${randomUUID().replaceAll("-", "")}`;
        await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
        await sql(tx, initial);
        await sql(tx, `
          INSERT INTO "User" (id, name, email, "passwordHash") VALUES
            ('real-owner', 'Real owner', 'real@verification.invalid', 'unused'),
            ('seed-owner', 'Seed owner', 'demo@petnamora.invalid', 'unused');
          INSERT INTO "Session" (id, "userId", "expiresAt") VALUES
            ('real-session', 'real-owner', CURRENT_TIMESTAMP + INTERVAL '1 day'),
            ('seed-session', 'seed-owner', CURRENT_TIMESTAMP + INTERVAL '1 day');
          INSERT INTO "Dog" (id, "ownerId", name, breed, sex, "ageMonths", size, city, state, bio, "photoUrl", demo) VALUES
            ('real-a', 'real-owner', 'Real A', 'Breed', 'MALE', 30, 'Médio', 'City', 'SP', 'Real biography', '/real-a.png', false),
            ('real-b', '${keepSeedOwner ? "seed-owner" : "real-owner"}', 'Real B', 'Breed', 'FEMALE', 30, 'Médio', 'City', 'SP', 'Real biography', '/real-b.png', false),
            ('demo-a', 'seed-owner', 'Example', 'Breed', 'FEMALE', 30, 'Médio', 'City', 'SP', 'Fictitious', '/demo.png', true);
          INSERT INTO "Like" (id, "fromId", "toId") VALUES
            ('real-like', 'real-a', 'real-b'), ('demo-like', 'real-a', 'demo-a');
          INSERT INTO "Match" (id, "dogAId", "dogBId") VALUES
            ('real-match', 'real-a', 'real-b'), ('demo-match', 'real-a', 'demo-a');
          INSERT INTO "Message" (id, "matchId", "senderId", text) VALUES
            ('real-message', 'real-match', 'real-owner', 'Keep this conversation'),
            ('demo-message', 'demo-match', 'real-owner', 'Remove this conversation');
          INSERT INTO "Report" (id, "reporterId", "dogId", reason) VALUES
            ('real-report', 'real-owner', 'real-b', 'Keep report'),
            ('demo-report', 'real-owner', 'demo-a', 'Remove report');
        `);
        const before = await tx.$queryRawUnsafe('SELECT to_jsonb(d) - \'demo\' AS row FROM "Dog" d WHERE demo = false ORDER BY id');
        await sql(tx, cleanup);
        assert.deepEqual(await tx.$queryRawUnsafe('SELECT to_jsonb(d) AS row FROM "Dog" d ORDER BY id'), before);
        for (const [table, id] of [["Like", "real-like"], ["Match", "real-match"], ["Message", "real-message"], ["Report", "real-report"]])
          assert.deepEqual(await tx.$queryRawUnsafe(`SELECT id FROM "${table}"`), [{ id }]);
        assert.equal((await tx.$queryRawUnsafe('SELECT id FROM "User"')).length, keepSeedOwner ? 2 : 1);
        assert.equal((await tx.$queryRawUnsafe('SELECT id FROM "Session"')).length, keepSeedOwner ? 2 : 1);
        assert.deepEqual(await tx.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'Dog' AND column_name = 'demo'`), []);
        throw rollback;
      }, { timeout: 30000 }), (error) => error === rollback);
    } finally {
      await db.$disconnect();
    }
  });
}
