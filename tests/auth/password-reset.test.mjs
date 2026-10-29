import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import test from "node:test";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());

test("password recovery through HTTP with isolated database and simulated Resend", { timeout: 120000 }, async (t) => {
  await access(path.resolve(".next/standalone/server.js"));
  const schema = `reset_verify_${randomUUID().replaceAll("-", "")}`;
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set("schema", schema);
  const rootDb = new PrismaClient();
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  const publicOrigin = "https://petnamora.example";
  const messages = [];
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  let providerMode = "success";
  let server;
  let origin;
  let logs = "";
  const provider = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    messages.push(payload);
    assert.equal(request.headers.authorization, "Bearer test-resend-key");
    assert.equal(request.url, "/emails");
    if (providerMode === "timeout") return;
    response.setHeader("Content-Type", "application/json");
    if (providerMode === "error") response.writeHead(500).end(JSON.stringify({ message: "Provider unavailable" }));
    else if (providerMode === "malformed") response.end("{}");
    else response.end(JSON.stringify({ id: randomUUID() }));
  });
  async function stopServer() {
    if (server && server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
  }
  try {
    await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
    await rootDb.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: databaseUrl.toString() }, windowsHide: true, stdio: "pipe",
    });
    const listener = createServer();
    await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
    const port = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    origin = `http://127.0.0.1:${port}`;
    async function startServer(extraEnv = {}) {
      server = spawn(process.execPath, ["--require", path.resolve("tests/auth/resend-mock.cjs"), path.resolve(".next/standalone/server.js")], {
        env: {
          ...process.env, DATABASE_URL: databaseUrl.toString(), NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1",
          APP_URL: publicOrigin, JWT_SECRET: randomBytes(48).toString("hex"), RESEND_API_KEY: "test-resend-key",
          EMAIL_FROM: "nao-responda@petnamora.example", AUTH_TEST_RESEND_URL: `http://127.0.0.1:${provider.address().port}`,
          ...extraEnv,
        }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      });
      server.stdout.on("data", (chunk) => { logs += chunk; });
      server.stderr.on("data", (chunk) => { logs += chunk; });
      for (let n = 0; n < 100; n++) {
        try { if ((await fetch(`${origin}/api/health`)).ok) return; } catch { /* Wait for the server. */ }
        if (server.exitCode !== null) break;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      throw new Error(`Test server failed: ${logs}`);
    }
    await startServer();
    const post = (route, body, headers = {}) => fetch(`${origin}${route}`, {
      method: "POST", headers: { Origin: publicOrigin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
    });
    const forgot = (email, headers) => post("/api/auth/forgot-password", { email }, headers);
    const reset = (token, password = "nova-senha-segura") => post("/api/auth/reset-password", { token, password });
    async function allowRequest(email) {
      await db.passwordResetRequest.deleteMany({ where: { emailHash: hash(email) } });
    }
    function latestToken() {
      const link = new URL(messages.at(-1).text.match(/https:\/\/\S+/)[0]);
      assert.equal(link.origin, publicOrigin);
      assert.equal(link.pathname, "/reset-password");
      return link.searchParams.get("resetToken");
    }
    const oldPassword = "senha-antiga-segura";
    const user = await db.user.create({ data: { name: "Família Amora", email: "amora@example.com", passwordHash: await bcrypt.hash(oldPassword, 4) } });
    let token;
    let sessionCookie;
    await t.test("validates input and origin before email or database changes", async () => {
      assert.equal((await forgot("invalid")).status, 400);
      assert.equal((await forgot(user.email, { Origin: "https://attacker.example" })).status, 403);
      assert.equal((await reset("x".repeat(64))).status, 400);
      assert.equal(await db.passwordResetRequest.count(), 0);
      assert.equal(messages.length, 0);
    });
    await t.test("normalizes email, sends branded HTML and text with trusted origin, stores only a hash", async () => {
      const response = await forgot("  AMORA@example.com  ", { "X-Forwarded-Host": "attacker.example" });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const result = await response.json();
      assert.match(result.message, /Se este e-mail estiver cadastrado/);
      assert.equal(messages.length, 1);
      assert.equal(messages[0].from, "Pet Namora <nao-responda@petnamora.example>");
      assert.deepEqual(messages[0].to, [user.email]);
      assert.match(messages[0].html, /Criar nova senha/);
      assert.match(messages[0].html, /petnamora-logo-02.png/);
      token = latestToken();
      assert.match(token, /^[a-f0-9]{64}$/);
      const saved = await db.passwordResetToken.findUnique({ where: { userId: user.id } });
      assert.equal(saved.tokenHash, hash(token));
      assert.ok(saved.expiresAt.getTime() > Date.now() + 3500000);
      assert.ok(saved.expiresAt.getTime() <= Date.now() + 3600000);
      assert.ok(!JSON.stringify(saved).includes(token));
      assert.ok(!JSON.stringify(result).includes(token));
      assert.ok(!logs.includes(token));
    });
    await t.test("unknown and suspended accounts return the same message without sending; limits also apply to unknown addresses", async () => {
      const expected = await (await forgot("unknown@example.com")).json();
      await db.user.create({ data: { name: "Suspensa", email: "suspensa@example.com", passwordHash: user.passwordHash, suspendedAt: new Date() } });
      assert.deepEqual(await (await forgot("suspensa@example.com")).json(), expected);
      assert.equal((await forgot("unknown@example.com")).status, 429);
      assert.equal(messages.length, 1);
    });
    await t.test("shares throttling across processes/restarts and enforces five requests per hour", async () => {
      assert.equal((await forgot(user.email)).status, 429);
      await stopServer();
      await startServer();
      assert.equal((await forgot(user.email)).status, 429);
      await db.passwordResetRequest.update({ where: { emailHash: hash(user.email) }, data: { requestedAt: new Date(Date.now() - 61000), attempts: 5 } });
      assert.equal((await forgot(user.email)).status, 429);
      await db.passwordResetRequest.update({ where: { emailHash: hash(user.email) }, data: { windowStart: new Date(Date.now() - 3601000) } });
      assert.equal((await forgot(user.email)).status, 200);
      assert.equal((await db.passwordResetRequest.findUnique({ where: { emailHash: hash(user.email) } })).attempts, 1);
      assert.equal((await reset(token)).status, 400);
      token = latestToken();
    });
    await t.test("concurrent requests send only one email and replace the previous link", async () => {
      await allowRequest(user.email);
      const before = messages.length;
      const responses = await Promise.all([forgot(user.email), forgot(user.email)]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 429]);
      assert.equal(messages.length, before + 1);
      assert.equal((await reset(token)).status, 400);
      token = latestToken();
    });
    await t.test("expired links and invalid passwords do not change password or consume a valid token", async () => {
      assert.equal((await post("/api/auth/reset-password", { token, password: "nova-senha-segura" }, { Origin: "https://attacker.example" })).status, 403);
      assert.equal((await reset(token, "short")).status, 400);
      assert.equal((await reset(token, "é".repeat(37))).status, 400);
      assert.equal(await db.passwordResetToken.count({ where: { userId: user.id } }), 1);
      await db.passwordResetToken.update({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await reset(token)).status, 400);
      assert.equal((await db.user.findUnique({ where: { id: user.id } })).passwordHash, user.passwordHash);
      await allowRequest(user.email);
      assert.equal((await forgot(user.email)).status, 200);
      token = latestToken();
    });
    await t.test("password change consumes once, revokes all sessions and requires new password at login", async () => {
      const login = await post("/api/auth", { action: "login", email: user.email, password: oldPassword });
      assert.equal(login.status, 200);
      sessionCookie = login.headers.getSetCookie().find((value) => value.startsWith("petnamora_session="))?.split(";")[0];
      await db.session.create({ data: { userId: user.id, expiresAt: new Date(Date.now() + 86400000) } });
      const otherUser = await db.user.create({ data: { name: "Outra família", email: "other@example.com", passwordHash: user.passwordHash } });
      const otherSession = await db.session.create({ data: { userId: otherUser.id, expiresAt: new Date(Date.now() + 86400000) } });
      const responses = await Promise.all([reset(token), reset(token)]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
      assert.equal(await db.passwordResetToken.count({ where: { userId: user.id } }), 0);
      assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
      assert.ok(await db.session.findUnique({ where: { id: otherSession.id } }));
      const session = await fetch(`${origin}/api/auth`, { headers: { Cookie: sessionCookie } });
      assert.equal((await session.json()).user, null);
      assert.equal((await reset(token)).status, 400);
      assert.equal((await post("/api/auth", { action: "login", email: user.email, password: oldPassword })).status, 401);
      assert.equal((await post("/api/auth", { action: "login", email: user.email, password: "nova-senha-segura" })).status, 200);
    });
    await t.test("provider errors, malformed success and timeout return 503 and discard the undelivered token", async () => {
      for (const mode of ["error", "malformed", "timeout"]) {
        providerMode = mode;
        await allowRequest(user.email);
        const response = await forgot(user.email);
        assert.equal(response.status, 503);
        assert.match((await response.json()).error, /Não foi possível enviar/);
        assert.equal(await db.passwordResetToken.count({ where: { userId: user.id } }), 0);
        assert.ok(!logs.includes(latestToken()));
      }
      providerMode = "success";
    });
    await t.test("recovery works for Google accounts, preserves identity, and cascades on account deletion", async () => {
      const googleUser = await db.user.create({ data: { name: "Google", email: "google@example.com", googleId: "google-reset-sub", passwordHash: user.passwordHash } });
      assert.equal((await forgot(googleUser.email)).status, 200);
      assert.equal((await reset(latestToken())).status, 200);
      const updated = await db.user.findUnique({ where: { id: googleUser.id } });
      assert.equal(updated.googleId, googleUser.googleId);
      assert.equal(await bcrypt.compare("nova-senha-segura", updated.passwordHash), true);
      await allowRequest(googleUser.email);
      assert.equal((await forgot(googleUser.email)).status, 200);
      const deletedToken = latestToken();
      await db.user.delete({ where: { id: googleUser.id } });
      assert.equal((await reset(deletedToken)).status, 400);
      assert.equal(await db.passwordResetToken.count({ where: { userId: googleUser.id } }), 0);
    });
    await t.test("suspension or changed email after issuing a link prevents using it", async () => {
      await allowRequest(user.email);
      assert.equal((await forgot(user.email)).status, 200);
      token = latestToken();
      await db.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } });
      assert.equal((await reset(token)).status, 400);
      await db.user.update({ where: { id: user.id }, data: { suspendedAt: null, email: "changed@example.com" } });
      assert.equal((await reset(token)).status, 400);
    });
    await t.test("renders recovery pages, protects referrer and lets the user return to login", async () => {
      const forgotPage = await fetch(`${origin}/forgot-password`);
      assert.equal(forgotPage.status, 200);
      assert.match(await forgotPage.text(), /Enviar link de recuperação/);
      const resetPage = await fetch(`${origin}/reset-password?resetToken=${token}`);
      assert.equal(resetPage.headers.get("referrer-policy"), "no-referrer");
      assert.match(resetPage.headers.get("cache-control"), /no-store/);
      assert.match(await resetPage.text(), /Confirme a nova senha/);
      assert.match(await (await fetch(`${origin}/reset-password`)).text(), /Este link de recuperação é inválido/);
      const home = await fetch(`${origin}/?auth=login`);
      assert.equal(home.status, 200);
      assert.match(await home.text(), /initialLogin/);
    });
    await t.test("missing credentials or unsafe APP_URL return 503 even for absent accounts, without consuming requests", async () => {
      // Windows omits empty environment values, allowing Next to reload .env.
      // Whitespace remains explicit and is treated as missing by configuration.
      for (const config of [{ RESEND_API_KEY: " " }, { EMAIL_FROM: " " }, { APP_URL: " " }, { APP_URL: "http://unsafe.example" }, { APP_URL: "invalid" }]) {
        await stopServer();
        await startServer(config);
        for (const email of ["changed@example.com", "absent-config@example.com"]) {
          const response = await forgot(email);
          assert.equal(response.status, 503, `Configuration ${JSON.stringify(config)}: ${await response.text()}`);
          assert.equal(await db.passwordResetRequest.count({ where: { emailHash: hash(email) } }), 0);
        }
      }
    });
  } finally {
    await stopServer();
    provider.closeAllConnections();
    await new Promise((resolve) => provider.close(resolve));
    await db.$disconnect();
    await rootDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await rootDb.$disconnect();
  }
});
