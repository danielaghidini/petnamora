import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

test("multiple photos persist through upload, creation, editing and discovery", { timeout: 120000 }, async (t) => {
  const schema = `photos_http_${randomUUID().replaceAll("-", "")}`;
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set("schema", schema);
  const rootDb = new PrismaClient();
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  const uploads = await mkdtemp(path.join(tmpdir(), "petnamora-photos-"));
  let server;
  let logs = "";
  try {
    await rootDb.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: databaseUrl.toString() }, windowsHide: true, stdio: "pipe",
    });
    const listener = createServer();
    await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
    const port = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [path.resolve(".next/standalone/server.js")], {
      env: { ...process.env, DATABASE_URL: databaseUrl.toString(), NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1", APP_URL: origin,
        JWT_SECRET: randomBytes(48).toString("hex"), PHOTO_STORAGE: "local", UPLOAD_DIR: uploads },
      windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (chunk) => { logs += chunk; });
    server.stderr.on("data", (chunk) => { logs += chunk; });
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(`${origin}/api/health`)).ok) break; } catch { /* Waiting for server. */ }
      if (server.exitCode !== null || attempt === 99) throw new Error(logs);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    async function request(route, { cookie, body, method = body ? "POST" : "GET" } = {}) {
      return fetch(`${origin}${route}`, { method, headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    }
    async function register(name) {
      const response = await request("/api/auth", { body: { action: "register", name, email: `${name}@photos.invalid`, password: randomBytes(18).toString("hex") } });
      assert.equal(response.status, 200);
      return response.headers.get("set-cookie").split(";")[0];
    }
    const owner = await register("owner");
    const other = await register("other");
    const urls = [];
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=", "base64");
    await t.test("uploads accept each photo and return retrievable content", async () => {
      for (let index = 0; index < 3; index++) {
        const form = new FormData();
        form.set("image", new Blob([png], { type: "image/png" }), `photo-${index}.png`);
        const response = await fetch(`${origin}/api/upload`, { method: "POST", headers: { Origin: origin, Cookie: owner }, body: form });
        assert.equal(response.status, 201);
        const { url } = await response.json();
        urls.push(url);
        const image = await fetch(`${origin}${url}`);
        assert.equal(image.status, 200);
        assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
      }
    });
    const input = { name: "Amora", breed: "Labrador", sex: "FEMALE", ageMonths: 36, size: "Grande", city: "São Paulo", state: "SP",
      bio: "Adora brincar e passear com a família.", photoUrl: urls[0], pedigree: false, vaccinated: true, healthTests: false };
    let dog;
    await t.test("creation saves all photos with the first as cover", async () => {
      const response = await request("/api/dogs", { cookie: owner, body: { ...input, photoUrls: urls } });
      assert.equal(response.status, 201);
      dog = (await response.json()).dog;
      assert.deepEqual(dog.photoUrls, urls);
      assert.equal(dog.photoUrl, urls[0]);
      assert.deepEqual((await db.dog.findUnique({ where: { id: dog.id } })).photoUrls, urls);
    });
    await t.test("discovery and reloading owner's profiles return the gallery", async () => {
      for (const [route, cookie] of [["/api/dogs", undefined], ["/api/dogs?mine=true", owner]]) {
        const response = await request(route, { cookie });
        assert.deepEqual((await response.json()).dogs.find((item) => item.id === dog.id).photoUrls, urls);
      }
    });
    await t.test("only the owner may edit photos", async () => {
      assert.equal((await request("/api/dogs", { method: "PATCH", cookie: other, body: { ...input, id: dog.id, photoUrls: [urls[1]] } })).status, 404);
      assert.equal((await request("/api/dogs", { method: "PATCH", body: { ...input, id: dog.id, photoUrls: urls } })).status, 401);
      assert.deepEqual((await db.dog.findUnique({ where: { id: dog.id } })).photoUrls, urls);
    });
    await t.test("invalid galleries do not replace saved photos", async () => {
      const tooMany = Array.from({ length: 11 }, () => `/api/photos/${randomUUID()}.png`);
      for (const photoUrls of [[], tooMany, [urls[0], urls[0]], ["https://example.com/dog.png"]]) {
        assert.equal((await request("/api/dogs", { method: "PATCH", cookie: owner, body: { ...input, id: dog.id, photoUrls } })).status, 400);
      }
      assert.deepEqual((await db.dog.findUnique({ where: { id: dog.id } })).photoUrls, urls);
    });
    await t.test("changing the cover and removing photos persist together", async () => {
      const photoUrls = [urls[2], urls[0]];
      const response = await request("/api/dogs", { method: "PATCH", cookie: owner, body: { ...input, id: dog.id, photoUrls } });
      assert.equal(response.status, 200);
      const updated = (await response.json()).dog;
      assert.equal(updated.photoUrl, urls[2]);
      assert.deepEqual(updated.photoUrls, photoUrls);
      assert.deepEqual((await db.dog.findUnique({ where: { id: dog.id } })).photoUrls, photoUrls);
    });
    await t.test("older clients keep the gallery when editing other fields", async () => {
      const response = await request("/api/dogs", { method: "PATCH", cookie: owner, body: { ...input, photoUrl: urls[2], id: dog.id, name: "Amora editada" } });
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).dog.photoUrls, [urls[2], urls[0]]);
      const legacy = await request("/api/dogs", { cookie: owner, body: input });
      assert.equal(legacy.status, 201);
      assert.deepEqual((await legacy.json()).dog.photoUrls, [urls[0]]);
    });
  } finally {
    if (server && server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
    await db.$disconnect();
    await rootDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await rootDb.$disconnect();
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(tmpdir()));
    await rm(uploads, { recursive: true, force: true });
  }
});
