import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const migration = await readFile(new URL("../../prisma/migrations/20261102180000_remove_seed_profiles/migration.sql", import.meta.url), "utf8");
const fixtures = [...migration.matchAll(/\('([^']+)', '([^']+)', '([^']+@example\.com)'\)/g)]
  .map(([, dogId, ownerId, email]) => ({ dogId, ownerId, email }));

test("fixture cleanup preserves real profiles, checks identity, cascades interactions and queues photos", async () => {
  assert.equal(fixtures.length, 50);
  const db = new PrismaClient();
  const rollback = new Error("rollback fixture cleanup verification");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const schema = `seed_cleanup_${randomUUID().replaceAll("-", "")}`;
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      async function sql(source) {
        for (const statement of source.replace(/--[^\n]*/g, "").split(";").map(s => s.trim())) {
          if (statement && !["BEGIN", "COMMIT"].includes(statement)) await tx.$executeRawUnsafe(statement);
        }
      }
      await sql(`
        CREATE TABLE "User" (id TEXT PRIMARY KEY, email TEXT UNIQUE, "isAdmin" BOOLEAN DEFAULT false);
        CREATE TABLE "Dog" (id TEXT PRIMARY KEY, "ownerId" TEXT REFERENCES "User" ON DELETE CASCADE, "photoUrl" TEXT, "photoUrls" TEXT[] DEFAULT '{}');
        CREATE TABLE "Session" (id TEXT PRIMARY KEY, "userId" TEXT REFERENCES "User" ON DELETE CASCADE);
        CREATE TABLE "Like" (id TEXT PRIMARY KEY, "fromId" TEXT REFERENCES "Dog" ON DELETE CASCADE, "toId" TEXT REFERENCES "Dog" ON DELETE CASCADE);
        CREATE TABLE "Match" (id TEXT PRIMARY KEY, "dogAId" TEXT REFERENCES "Dog" ON DELETE CASCADE, "dogBId" TEXT REFERENCES "Dog" ON DELETE CASCADE);
        CREATE TABLE "Message" (id TEXT PRIMARY KEY, "matchId" TEXT REFERENCES "Match" ON DELETE CASCADE, "senderId" TEXT REFERENCES "User" ON DELETE CASCADE);
        CREATE TABLE "Report" (id TEXT PRIMARY KEY, "dogId" TEXT REFERENCES "Dog" ON DELETE CASCADE, "reporterId" TEXT REFERENCES "User" ON DELETE CASCADE);
        CREATE TABLE "AdminAction" (id TEXT PRIMARY KEY, "actorId" TEXT REFERENCES "User" ON DELETE RESTRICT);
        CREATE TABLE "PhotoDeletion" (id TEXT PRIMARY KEY, url TEXT UNIQUE);
        INSERT INTO "User" (id, email) VALUES ('real-owner', 'real@verification.invalid');
        INSERT INTO "Dog" (id, "ownerId", "photoUrl") VALUES ('real-dog', 'real-owner', '/real.png');
        INSERT INTO "Session" VALUES ('real-session', 'real-owner');
        INSERT INTO "Like" VALUES ('real-like', 'real-dog', 'real-dog');
        INSERT INTO "Match" VALUES ('real-match', 'real-dog', 'real-dog');
        INSERT INTO "Message" VALUES ('real-message', 'real-match', 'real-owner');
        INSERT INTO "Report" VALUES ('real-report', 'real-dog', 'real-owner');
      `);
      // A fixture owner with an additional real dog must keep that dog and account.
      for (const [i, fixture] of fixtures.slice(0, 6).entries()) {
        await tx.$executeRawUnsafe('INSERT INTO "User" (id, email, "isAdmin") VALUES ($1, $2, $3)',
          fixture.ownerId, i === 2 ? "changed@verification.invalid" : fixture.email, i === 3);
        await tx.$executeRawUnsafe('INSERT INTO "Dog" (id, "ownerId", "photoUrl", "photoUrls") VALUES ($1, $2, $3, $4)',
          fixture.dogId, i === 4 ? "real-owner" : fixture.ownerId, `/fixture-${i}.png`, [`/fixture-${i}.png`, "/shared.png"]);
        await tx.$executeRawUnsafe('INSERT INTO "Session" VALUES ($1, $2)', `fixture-session-${i}`, fixture.ownerId);
      }
      await tx.$executeRawUnsafe('INSERT INTO "Dog" (id, "ownerId", "photoUrl") VALUES ($1, $2, $3)',
        "additional-real-dog", fixtures[1].ownerId, "/shared.png");
      await tx.$executeRawUnsafe('INSERT INTO "AdminAction" VALUES ($1, $2)', "former-admin", fixtures[5].ownerId);
      await tx.$executeRawUnsafe('INSERT INTO "Like" VALUES ($1, $2, $3)', "fixture-like", "real-dog", fixtures[0].dogId);
      await tx.$executeRawUnsafe('INSERT INTO "Match" VALUES ($1, $2, $3)', "fixture-match", "real-dog", fixtures[0].dogId);
      await tx.$executeRawUnsafe('INSERT INTO "Message" VALUES ($1, $2, $3)', "fixture-message", "fixture-match", "real-owner");
      await tx.$executeRawUnsafe('INSERT INTO "Report" VALUES ($1, $2, $3)', "fixture-report", fixtures[0].dogId, "real-owner");
      const beforeReal = await tx.$queryRawUnsafe('SELECT * FROM "Dog" WHERE id IN (\'real-dog\', \'additional-real-dog\') ORDER BY id');
      await sql(migration);
      assert.deepEqual(await tx.$queryRawUnsafe('SELECT * FROM "Dog" WHERE id IN (\'real-dog\', \'additional-real-dog\') ORDER BY id'), beforeReal);
      const remainingIds = (await tx.$queryRawUnsafe('SELECT id FROM "Dog"')).map(row => row.id);
      for (const i of [0, 1, 5]) assert.ok(!remainingIds.includes(fixtures[i].dogId));
      for (const i of [2, 3, 4]) assert.ok(remainingIds.includes(fixtures[i].dogId));
      const remainingOwners = (await tx.$queryRawUnsafe('SELECT id FROM "User"')).map(row => row.id);
      assert.ok(!remainingOwners.includes(fixtures[0].ownerId));
      assert.ok(remainingOwners.includes(fixtures[1].ownerId));
      assert.ok(remainingOwners.includes(fixtures[5].ownerId));
      for (const [table, id] of [["Like", "real-like"], ["Match", "real-match"], ["Message", "real-message"], ["Report", "real-report"]]) {
        assert.deepEqual(await tx.$queryRawUnsafe(`SELECT id FROM "${table}"`), [{ id }]);
      }
      const queued = await tx.$queryRawUnsafe('SELECT url FROM "PhotoDeletion" ORDER BY url');
      assert.deepEqual(queued.map(row => row.url), ["/fixture-0.png", "/fixture-1.png", "/fixture-5.png", "/shared.png"]);
      assert.ok((await tx.$queryRawUnsafe('SELECT id FROM "Session"')).some(row => row.id === "real-session"));
      // Re-running the removal is harmless, including already queued shared photos.
      await tx.$executeRawUnsafe('DROP TABLE "PetNamoraSeedProfilesToRemove"');
      await sql(migration);
      assert.deepEqual(await tx.$queryRawUnsafe('SELECT url FROM "PhotoDeletion" ORDER BY url'), queued);
      throw rollback;
    }, { timeout: 30000 }), error => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
