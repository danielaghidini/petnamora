import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { access } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());

test("admin permissions, moderation and audit through HTTP", { timeout: 120000 }, async (t) => {
  await access(path.resolve(".next/standalone/server.js"));
  const schema = `admin_verify_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("schema", schema);
  const databaseUrl = url.toString();
  const rootDb = new PrismaClient();
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const password = randomBytes(18).toString("hex");
  let server;
  let serverLogs = "";
  try {
    await rootDb.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: databaseUrl }, windowsHide: true, stdio: "pipe",
    });
    const listener = createServer();
    await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
    const port = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [path.resolve(".next/standalone/server.js")], {
      env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1", APP_URL: origin, JWT_SECRET: randomBytes(48).toString("hex") },
      windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (chunk) => { serverLogs += chunk; });
    server.stderr.on("data", (chunk) => { serverLogs += chunk; });
    for (let n = 0; n < 100; n++) {
      try { if ((await fetch(`${origin}/api/health`)).ok) break; } catch { /* Wait for the server to bind. */ }
      if (server.exitCode !== null || n === 99) throw new Error(`Test server failed: ${serverLogs}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    async function request(route, { cookie, body, method = body ? "POST" : "GET", requestOrigin = origin } = {}) {
      return fetch(`${origin}${route}`, {
        method, headers: { "Content-Type": "application/json", Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    }
    async function login(email) {
      const response = await request("/api/auth", { body: { action: "login", email, password } });
      assert.equal(response.status, 200);
      return response.headers.get("set-cookie").split(";")[0];
    }
    const passwordHash = await bcrypt.hash(password, 4);
    const [admin, first, second] = await Promise.all(["admin", "first", "second"].map((name) => db.user.create({
      data: { name: `Verify ${name}`, email: `${name}@admin-verification.invalid`, passwordHash },
    })));
    const dogInput = {
      name: "Amora", breed: "Labrador", sex: "FEMALE", ageMonths: 36, size: "Grande", city: "São Paulo", state: "SP",
      bio: "Apresentação para verificar moderação.", photoUrl: "/api/photos/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png",
      pedigree: false, vaccinated: true, healthTests: false, neutered: false,
    };
    const [dogA, dogB] = await Promise.all([
      db.dog.create({ data: { ...dogInput, ownerId: first.id, name: "Bento", sex: "MALE" } }),
      db.dog.create({ data: { ...dogInput, ownerId: second.id } }),
    ]);
    const [firstCookie, secondCookie] = await Promise.all([login(first.email), login(second.email)]);
    const change = { kind: "dog", id: dogB.id, expected: false, value: true, reason: "Verificação de moderação" };
    let adminCookie;
    await t.test("anonymous visitors and regular users cannot read or change admin data", async () => {
      assert.equal((await request("/api/admin", { body: change })).status, 401);
      assert.equal((await request("/api/admin", { body: change, cookie: firstCookie })).status, 403);
      const anonymous = await (await request("/admin?view=users")).text();
      assert.match(anonymous, /Entrar no painel/);
      assert.ok(!anonymous.includes(first.email));
      const denied = await (await request("/admin?view=users", { cookie: firstCookie })).text();
      assert.match(denied, /Acesso restrito/);
      assert.ok(!denied.includes(second.email));
      const registered = await request("/api/auth", { body: { action: "register", name: "Public account", email: "public@admin-verification.invalid", password, isAdmin: true } });
      assert.equal(registered.status, 200);
      assert.equal((await registered.json()).user.isAdmin, false);
    });
    await t.test("grant command promotes only an existing account and records it once", async () => {
      const run = () => execFileSync(process.execPath, [path.resolve("scripts/grant-admin.mjs"), `--email=${admin.email}`], { env: { ...process.env, DATABASE_URL: databaseUrl }, windowsHide: true, stdio: "pipe" });
      run(); run();
      assert.equal((await db.user.findUnique({ where: { id: admin.id } })).isAdmin, true);
      assert.equal(await db.adminAction.count({ where: { action: "ADMIN_GRANTED" } }), 1);
      adminCookie = await login(admin.email);
      for (const view of ["overview", "users", "dogs", "reports", "activity"]) {
        const response = await request(`/admin?view=${view}`, { cookie: adminCookie });
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /Cuidar de cada patinha/);
        assert.ok(!html.includes(passwordHash));
      }
      const filtered = await (await request("/admin?view=users&q=second", { cookie: adminCookie })).text();
      assert.ok(filtered.includes(second.email));
      assert.ok(!filtered.includes(first.email));
    });
    await t.test("user search and pagination keep records in their own page", async () => {
      await db.user.createMany({ data: Array.from({ length: 23 }, (_, index) => ({
        id: `pagination-${String(index).padStart(2, "0")}`, name: `Paginação ${index}`,
        email: `pagination-${String(index).padStart(2, "0")}@admin-verification.invalid`, passwordHash,
      })) });
      const firstPage = await (await request("/admin?view=users&q=pagination-", { cookie: adminCookie })).text();
      const secondPage = await (await request("/admin?view=users&q=pagination-&page=2", { cookie: adminCookie })).text();
      assert.ok(firstPage.includes("pagination-22@admin-verification.invalid"));
      assert.ok(!firstPage.includes("pagination-00@admin-verification.invalid"));
      assert.ok(secondPage.includes("pagination-00@admin-verification.invalid"));
      assert.ok(!secondPage.includes("pagination-22@admin-verification.invalid"));
    });
    await t.test("cross-origin, invalid and protected-account changes are rejected without audit writes", async () => {
      const before = await db.adminAction.count();
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: change, requestOrigin: "https://other.invalid" })).status, 403);
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: { ...change, reason: "" } })).status, 400);
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: { ...change, isAdmin: true } })).status, 400);
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: { ...change, kind: "user", id: admin.id } })).status, 403);
      assert.equal(await db.adminAction.count(), before);
    });
    let matchId;
    await t.test("blocked dogs disappear from discovery, likes and chats, including existing matches", async () => {
      assert.equal((await request("/api/likes", { cookie: firstCookie, body: { fromId: dogA.id, toId: dogB.id } })).status, 200);
      const reciprocal = await (await request("/api/likes", { cookie: secondCookie, body: { fromId: dogB.id, toId: dogA.id } })).json();
      assert.equal(reciprocal.matched, true);
      matchId = reciprocal.matchId;
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: change })).status, 200);
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: change })).status, 409);
      assert.deepEqual((await (await request("/api/dogs")).json()).dogs.map((dog) => dog.id), [dogA.id]);
      assert.deepEqual((await (await request("/api/likes", { cookie: firstCookie })).json()).dogs, []);
      assert.deepEqual((await (await request("/api/matches", { cookie: firstCookie })).json()).matches, []);
      assert.equal((await request(`/api/messages?matchId=${matchId}`, { cookie: firstCookie })).status, 403);
      assert.equal((await request("/api/messages", { cookie: firstCookie, body: { matchId, text: "Não deve ser enviada" } })).status, 403);
      assert.equal((await request("/api/likes", { cookie: firstCookie, body: { fromId: dogA.id, toId: dogB.id } })).status, 404);
      assert.equal((await request("/api/dogs", { cookie: secondCookie, method: "PATCH", body: { ...dogInput, id: dogB.id, blockedAt: null } })).status, 200);
      assert.ok((await db.dog.findUnique({ where: { id: dogB.id } })).blockedAt);
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: { ...change, value: false, expected: true } })).status, 200);
      assert.equal((await (await request("/api/matches", { cookie: firstCookie })).json()).matches.length, 1);
    });
    await t.test("suspension revokes sessions, prevents login and hides the owner's dogs and conversations", async () => {
      const suspend = { kind: "user", id: second.id, value: true, expected: false, reason: "Conta suspensa na verificação" };
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: suspend })).status, 200);
      assert.equal(await db.session.count({ where: { userId: second.id } }), 0);
      assert.equal((await (await request("/api/auth", { cookie: secondCookie })).json()).user, null);
      assert.equal((await request("/api/dogs?mine=true", { cookie: secondCookie })).status, 401);
      assert.equal((await request("/api/auth", { body: { action: "login", email: second.email, password } })).status, 403);
      assert.deepEqual((await (await request("/api/dogs")).json()).dogs.map((dog) => dog.id), [dogA.id]);
      assert.equal((await request(`/api/messages?matchId=${matchId}`, { cookie: firstCookie })).status, 403);
      await request("/api/admin", { cookie: adminCookie, body: { ...change, value: true, expected: false } });
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: { ...suspend, value: false, expected: true } })).status, 200);
      assert.ok((await db.dog.findUnique({ where: { id: dogB.id } })).blockedAt);
      assert.equal((await (await request("/api/auth", { cookie: secondCookie })).json()).user, null);
      await request("/api/admin", { cookie: adminCookie, body: { ...change, value: false, expected: true } });
    });
    await t.test("report review preserves personal protection and supports reopening and fresh reports", async () => {
      assert.equal((await request("/api/reports", { cookie: firstCookie, body: { dogId: dogB.id, reason: "Relato para análise da equipe" } })).status, 200);
      const report = await db.report.findFirstOrThrow();
      const review = { kind: "report", id: report.id, expected: "OPEN", value: "RESOLVED", reason: "Análise de denúncia concluída" };
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: review })).status, 200);
      assert.ok((await db.report.findUnique({ where: { id: report.id } })).reviewedAt);
      assert.equal((await request(`/api/messages?matchId=${matchId}`, { cookie: firstCookie })).status, 403);
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: { ...review, expected: "RESOLVED", value: "OPEN" } })).status, 200);
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: { ...review, value: "DISMISSED" } })).status, 200);
      assert.equal((await request("/api/reports", { cookie: firstCookie, body: { dogId: dogB.id, reason: "Novo relato para a equipe" } })).status, 200);
      const reopened = await db.report.findUnique({ where: { id: report.id } });
      assert.equal(reopened.status, "OPEN");
      assert.equal(reopened.reviewedAt, null);
      const reportHtml = await (await request("/admin?view=reports&status=OPEN", { cookie: adminCookie })).text();
      assert.ok(reportHtml.includes("Novo relato para a equipe"));
      assert.ok(reportHtml.includes("Concluir análise"));
      const actions = await db.adminAction.findMany({ where: { action: { not: "ADMIN_GRANTED" } } });
      assert.ok(actions.length >= 9);
      assert.ok(actions.every((action) => action.actorId === admin.id && action.reason.length >= 5));
    });
    await t.test("permissions are rechecked after admin access is revoked", async () => {
      await db.user.update({ where: { id: admin.id }, data: { isAdmin: false } });
      assert.equal((await request("/api/admin", { cookie: adminCookie, body: change })).status, 403);
      const denied = await (await request("/admin?view=users", { cookie: adminCookie })).text();
      assert.match(denied, /Acesso restrito/);
      assert.ok(!denied.includes(second.email));
    });
  } finally {
    if (server && server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
    await db.$disconnect();
    // Only the random schema created by this test is removed.
    await rootDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await rootDb.$disconnect();
  }
});
