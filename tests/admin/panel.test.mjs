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
    await t.test("discovery loads batches of 12 without skipping profiles or losing filters", async () => {
      const owner = await db.user.create({
        data: { name: "Pagination test", email: "pagination@admin-verification.invalid", passwordHash },
      });
      const breed = "Pagination fixture";
      const createdAt = new Date("2026-01-01T00:00:00.000Z");
      await db.dog.createMany({
        data: Array.from({ length: 65 }, (_, i) => ({
          ...dogInput, ownerId: owner.id, name: `Pagination ${i}`, breed, createdAt,
          city: i < 25 ? "Campinas" : "São Paulo",
          sex: i % 2 ? "MALE" : "FEMALE", pedigree: i % 2 === 0,
        })),
      });
      await db.dog.createMany({ data: [
        { ...dogInput, ownerId: owner.id, breed, active: false },
        { ...dogInput, ownerId: owner.id, breed, neutered: true },
        { ...dogInput, ownerId: owner.id, breed, blockedAt: new Date() },
      ] });
      async function page(params) {
        const response = await request(`/api/dogs?${params}`);
        assert.equal(response.status, 200);
        return response.json();
      }
      const expected = await db.dog.findMany({
        where: { breed, active: true, neutered: false, blockedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true },
      });
      const params = new URLSearchParams({ breed });
      let result = await page(params);
      assert.equal(result.dogs.length, 12);
      assert.ok(result.nextCursor);
      const found = result.dogs.map((dog) => dog.id);
      assert.ok(!("createdAt" in result.dogs[0]));
      // A new profile and a removed cursor row must not shift subsequent batches.
      await db.dog.create({ data: { ...dogInput, ownerId: owner.id, breed } });
      await db.dog.delete({ where: { id: found.at(-1) } });
      const batchSizes = [result.dogs.length];
      while (result.nextCursor) {
        params.set("cursor", result.nextCursor);
        result = await page(params);
        assert.ok(result.dogs.length <= 12);
        batchSizes.push(result.dogs.length);
        found.push(...result.dogs.map((dog) => dog.id));
        assert.ok(batchSizes.length < 10, "Pagination must terminate");
      }
      assert.deepEqual(batchSizes, [12, 12, 12, 12, 12, 5]);
      assert.deepEqual(found, expected.map((dog) => dog.id));
      assert.equal(new Set(found).size, 65);
      assert.equal(result.nextCursor, null);

      const filters = new URLSearchParams({ breed, city: "Campinas", sex: "FEMALE", size: "Grande", pedigree: "true" });
      const filtered = [];
      do {
        result = await page(filters);
        assert.ok(result.dogs.every((dog) => dog.city === "Campinas" && dog.sex === "FEMALE" && dog.size === "Grande" && dog.pedigree));
        filtered.push(...result.dogs.map((dog) => dog.id));
        if (result.nextCursor) filters.set("cursor", result.nextCursor);
      } while (result.nextCursor);
      assert.ok(filtered.length >= 12);
      assert.equal(new Set(filtered).size, filtered.length);

      const exactBreed = "Exactly twelve";
      await db.dog.createMany({ data: Array.from({ length: 12 }, () => ({ ...dogInput, breed: exactBreed, ownerId: owner.id })) });
      result = await page(new URLSearchParams({ breed: exactBreed }));
      assert.equal(result.dogs.length, 12);
      assert.equal(result.nextCursor, null);
      assert.deepEqual(await page(new URLSearchParams({ breed: "No matching breed" })), { dogs: [], nextCursor: null });
      const ownCookie = await login(owner.email);
      const own = await (await request(`/api/dogs?breed=${encodeURIComponent(breed)}`, { cookie: ownCookie })).json();
      assert.deepEqual(own, { dogs: [], nextCursor: null });
      for (const cursor of ["", "invalid", Buffer.from(JSON.stringify({ createdAt: "invalid", id: "x" })).toString("base64url")]) {
        assert.equal((await request(`/api/dogs?cursor=${cursor}`)).status, 400);
      }
    });
    await t.test("multiple breeds and Others combine with filters across every page", async () => {
      const owner = await db.user.create({
        data: { name: "Breed filters test", email: "breeds@admin-verification.invalid", passwordHash },
      });
      const city = "Teste de raças";
      const profiles = [
        ...Array.from({ length: 13 }, () => "Labrador"),
        ...Array.from({ length: 13 }, () => "Pug"),
        "Beagle", "Raça fora da lista", "Outra raça", "labrador", "Vira-lata", "SRD", "Shih Tzu",
      ];
      await db.dog.createMany({ data: profiles.map((breed) => ({
        ...dogInput, ownerId: owner.id, breed, city,
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
      })) });
      await db.dog.createMany({ data: [
        { ...dogInput, ownerId: owner.id, city, breed: "Pug", blockedAt: new Date() },
        { ...dogInput, ownerId: owner.id, city, breed: "Pug", neutered: true },
        { ...dogInput, ownerId: owner.id, city, breed: "Raça oculta", active: false },
        { ...dogInput, ownerId: owner.id, city, breed: "Pug", sex: "MALE" },
      ] });
      async function allPages(breeds) {
        const params = new URLSearchParams({ city, sex: "FEMALE", size: "Grande" });
        breeds.forEach((breed) => params.append("breeds", breed));
        const dogs = [];
        let pages = 0;
        while (true) {
          const response = await request(`/api/dogs?${params}`);
          assert.equal(response.status, 200);
          const result = await response.json();
          dogs.push(...result.dogs);
          assert.ok(++pages < 10, "Pagination must terminate");
          if (!result.nextCursor) break;
          params.set("cursor", result.nextCursor);
        }
        assert.equal(new Set(dogs.map((dog) => dog.id)).size, dogs.length);
        return dogs;
      }
      const selected = await allPages(["Labrador", "Pug"]);
      assert.equal(selected.length, 27);
      assert.ok(selected.every((dog) => ["labrador", "pug"].includes(dog.breed.toLowerCase())));
      const others = await allPages(["other"]);
      assert.deepEqual(others.map((dog) => dog.breed).sort(), ["Outra raça", "Raça fora da lista"]);
      const combined = await allPages(["Labrador", "Pug", "other"]);
      assert.equal(combined.length, 29);
      assert.ok(combined.every((dog) => dog.breed !== "Beagle" && dog.sex === "FEMALE"));
      const srd = await allPages(["Sem raça definida (SRD)"]);
      assert.deepEqual(srd.map((dog) => dog.breed).sort(), ["SRD", "Vira-lata"]);
      assert.deepEqual((await allPages(["Shih-tzu"])).map((dog) => dog.breed), ["Shih Tzu"]);
      assert.equal((await allPages([])).length, 33);
    });
    await t.test("registration omits the retired neutered field and edits preserve legacy restrictions", async () => {
      const owner = await db.user.create({
        data: { name: "Registration test", email: "registration@admin-verification.invalid", passwordHash },
      });
      const cookie = await login(owner.email);
      const profile = { ...dogInput };
      delete profile.neutered;
      const created = await request("/api/dogs", { cookie, body: profile });
      assert.equal(created.status, 201);
      const normal = (await created.json()).dog;
      assert.equal(normal.neutered, false);
      assert.equal((await request("/api/dogs", { cookie, body: { ...profile, neutered: true } })).status, 400);
      assert.equal(await db.dog.count({ where: { ownerId: owner.id } }), 1);

      const legacy = await db.dog.create({ data: { ...dogInput, ownerId: owner.id, neutered: true } });
      for (const change of [{}, { neutered: false }]) {
        const response = await request("/api/dogs", { cookie, method: "PATCH", body: { ...profile, id: legacy.id, name: "Nome atualizado", ...change } });
        assert.equal(response.status, 200);
        const updated = (await response.json()).dog;
        assert.equal(updated.name, "Nome atualizado");
        assert.equal(updated.neutered, true);
      }
      const edited = await request("/api/dogs", { cookie, method: "PATCH", body: { ...profile, id: normal.id, neutered: true } });
      assert.equal(edited.status, 200);
      assert.equal((await edited.json()).dog.neutered, false);
    });
    await t.test("direct chats require no likes, reuse the same thread and preserve messages when a match follows", async () => {
      const [sender, recipient] = await Promise.all(["sender", "recipient"].map((name) => db.user.create({
        data: { name, email: `${name}@direct-verification.invalid`, passwordHash },
      })));
      const [from, to] = await Promise.all([
        db.dog.create({ data: { ...dogInput, ownerId: sender.id, sex: "MALE" } }),
        db.dog.create({ data: { ...dogInput, ownerId: recipient.id } }),
      ]);
      const [senderCookie, recipientCookie] = await Promise.all([login(sender.email), login(recipient.email)]);
      const pair = { fromId: from.id, toId: to.id };
      const matchCount = await db.match.count({ where: { isMatch: true } });
      assert.equal((await request("/api/matches", { body: pair })).status, 401);
      assert.equal((await request("/api/matches", { cookie: senderCookie, body: pair, requestOrigin: "https://other.invalid" })).status, 403);
      assert.equal((await request("/api/matches", { cookie: senderCookie, body: { fromId: to.id, toId: from.id } })).status, 403);
      assert.equal((await request("/api/matches", { cookie: senderCookie, body: { toId: to.id } })).status, 400);
      const opened = await request("/api/matches", { cookie: senderCookie, body: pair });
      assert.equal(opened.status, 200);
      const { match } = await opened.json();
      assert.equal(match.isMatch, false);
      assert.equal(await db.match.count({ where: { isMatch: true } }), matchCount);
      assert.equal(await db.like.count({ where: { fromId: from.id } }), 0);
      assert.deepEqual((await (await request("/api/matches", { cookie: recipientCookie })).json()).matches, []);
      assert.equal((await request("/api/messages", { cookie: senderCookie, body: { matchId: match.id, text: "Oi! Gostaria de conhecer melhor seu cachorro." } })).status, 201);
      const received = await (await request(`/api/messages?matchId=${match.id}`, { cookie: recipientCookie })).json();
      assert.equal(received.messages[0].text, "Oi! Gostaria de conhecer melhor seu cachorro.");
      assert.equal((await request("/api/messages", { cookie: recipientCookie, body: { matchId: match.id, text: "Oi! Vamos conversar." } })).status, 201);
      assert.equal((await request(`/api/messages?matchId=${match.id}`, { cookie: firstCookie })).status, 404);
      assert.equal((await request("/api/messages", { cookie: firstCookie, body: { matchId: match.id, text: "Acesso indevido" } })).status, 404);
      const inbox = (await (await request("/api/matches", { cookie: recipientCookie })).json()).matches;
      assert.equal(inbox.length, 1);
      assert.equal(inbox[0].isMatch, false);
      const duplicate = await Promise.all(Array.from({ length: 3 }, () => request("/api/matches", { cookie: recipientCookie, body: { fromId: to.id, toId: from.id } })));
      for (const response of duplicate) {
        assert.equal(response.status, 200);
        assert.equal((await response.json()).match.id, match.id);
      }
      assert.equal(await db.match.count({ where: { OR: [{ dogAId: from.id }, { dogBId: from.id }] } }), 1);
      assert.equal((await (await request("/api/likes", { cookie: senderCookie, body: pair })).json()).matched, false);
      assert.equal((await db.match.findUnique({ where: { id: match.id } })).isMatch, false);
      const reciprocal = await (await request("/api/likes", { cookie: recipientCookie, body: { fromId: to.id, toId: from.id } })).json();
      assert.equal(reciprocal.matched, true);
      assert.equal(reciprocal.matchId, match.id);
      assert.equal((await db.match.findUnique({ where: { id: match.id } })).isMatch, true);
      assert.equal(await db.message.count({ where: { matchId: match.id } }), 2);
      assert.equal((await (await request("/api/matches", { cookie: senderCookie, body: pair })).json()).match.isMatch, true);
    });
    await t.test("direct chats keep ownership, moderation and mutual report protections", async () => {
      const [sender, recipient] = await Promise.all(["blocked-sender", "blocked-recipient"].map((name) => db.user.create({
        data: { name, email: `${name}@direct-verification.invalid`, passwordHash },
      })));
      const [from, to] = await Promise.all([
        db.dog.create({ data: { ...dogInput, ownerId: sender.id } }),
        db.dog.create({ data: { ...dogInput, ownerId: recipient.id } }),
      ]);
      const [senderCookie, recipientCookie] = await Promise.all([login(sender.email), login(recipient.email)]);
      const pair = { fromId: from.id, toId: to.id };
      const opened = await request("/api/matches", { cookie: senderCookie, body: pair });
      assert.equal(opened.status, 200); // Talking does not require an opposite-sex match.
      const { match } = await opened.json();
      assert.equal((await request("/api/messages", { cookie: senderCookie, body: { matchId: match.id, text: "Primeiro contato" } })).status, 201);
      assert.equal((await request("/api/reports", { cookie: recipientCookie, body: { dogId: from.id, reason: "Não desejo contato com este perfil" } })).status, 200);
      for (const cookie of [senderCookie, recipientCookie]) {
        assert.deepEqual((await (await request("/api/matches", { cookie })).json()).matches, []);
        assert.equal((await request(`/api/messages?matchId=${match.id}`, { cookie })).status, 403);
        assert.equal((await request("/api/messages", { cookie, body: { matchId: match.id, text: "Contato bloqueado" } })).status, 403);
      }
      assert.equal((await request("/api/matches", { cookie: senderCookie, body: pair })).status, 403);
      await db.report.updateMany({ where: { reporterId: recipient.id, dogId: from.id }, data: { status: "RESOLVED" } });
      assert.equal((await request("/api/matches", { cookie: senderCookie, body: pair })).status, 403);
      const blocked = await db.dog.create({ data: { ...dogInput, ownerId: recipient.id, blockedAt: new Date() } });
      assert.equal((await request("/api/matches", { cookie: senderCookie, body: { ...pair, toId: blocked.id } })).status, 404);
      assert.equal((await request("/api/matches", { cookie: senderCookie, body: { ...pair, toId: from.id } })).status, 400);
      await db.user.update({ where: { id: recipient.id }, data: { suspendedAt: new Date() } });
      assert.equal((await request("/api/matches", { cookie: senderCookie, body: pair })).status, 404);
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
