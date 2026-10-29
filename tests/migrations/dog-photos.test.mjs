import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const migration = await readFile(new URL("../../prisma/migrations/20261029010000_dog_photos/migration.sql", import.meta.url), "utf8");

test("photo migration preserves existing covers and supports older inserts", async () => {
  const db = new PrismaClient();
  const rollback = new Error("rollback photo migration verification");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const schema = `photos_verify_${randomUUID().replaceAll("-", "")}`;
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE "Dog" (id TEXT PRIMARY KEY, "photoUrl" TEXT NOT NULL)');
      await tx.$executeRawUnsafe(`INSERT INTO "Dog" VALUES ('existing', '/api/photos/existing.png')`);
      for (const statement of migration.split(";").map((sql) => sql.trim()).filter(Boolean)) {
        await tx.$executeRawUnsafe(statement);
      }
      assert.deepEqual(await tx.$queryRawUnsafe('SELECT * FROM "Dog"'), [
        { id: "existing", photoUrl: "/api/photos/existing.png", photoUrls: ["/api/photos/existing.png"] },
      ]);
      await tx.$executeRawUnsafe(`INSERT INTO "Dog" (id, "photoUrl") VALUES ('legacy', '/api/photos/legacy.png')`);
      assert.deepEqual(await tx.$queryRawUnsafe(`SELECT "photoUrls" FROM "Dog" WHERE id = 'legacy'`), [{ photoUrls: [] }]);
      throw rollback;
    }, { timeout: 30000 }), (error) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
