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

test("Google login and existing password accounts through HTTP", { timeout: 120000 }, async (t) => {
  await access(path.resolve(".next/standalone/server.js"));
  const schema = `auth_verify_${randomUUID().replaceAll("-", "")}`;
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set("schema", schema);
  const rootDb = new PrismaClient();
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  const grants = new Map();
  const tokens = new Map();
  let googleRequests = 0;
  let server;
  let logs = "";
  const google = createServer(async (request, response) => {
    googleRequests++;
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/token") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const params = new URLSearchParams(body);
      const grant = grants.get(params.get("code"));
      grants.delete(params.get("code"));
      if (!grant || grant.tokenFailure || params.get("client_id") !== "test-client" || params.get("client_secret") !== "test-secret" ||
          params.get("grant_type") !== "authorization_code" || params.get("redirect_uri") !== `${origin}/api/auth/google/callback` ||
          createHash("sha256").update(params.get("code_verifier") || "").digest("base64url") !== grant.challenge) {
        response.writeHead(400).end(JSON.stringify({ error: "invalid_grant" }));
        return;
      }
      const token = randomUUID();
      tokens.set(token, grant);
      response.end(JSON.stringify({ access_token: token, token_type: "Bearer" }));
      return;
    }
    const grant = tokens.get(request.headers.authorization?.replace(/^Bearer /, ""));
    if (!grant || grant.profileFailure) response.writeHead(401).end("{}");
    else response.end(JSON.stringify(grant.profile));
  });
  let origin;
  try {
    await new Promise((resolve) => google.listen(0, "127.0.0.1", resolve));
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
      server = spawn(process.execPath, ["--require", path.resolve("tests/auth/google-mock.cjs"), path.resolve(".next/standalone/server.js")], {
        env: {
          ...process.env, DATABASE_URL: databaseUrl.toString(), NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1",
          APP_URL: origin, JWT_SECRET: randomBytes(48).toString("hex"), GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret",
          GOOGLE_REDIRECT_URI: "", AUTH_TEST_GOOGLE_URL: `http://127.0.0.1:${google.address().port}`,
          ...extraEnv,
        }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      });
      server.stdout.on("data", (chunk) => { logs += chunk; });
      server.stderr.on("data", (chunk) => { logs += chunk; });
      for (let n = 0; n < 100; n++) {
        try { if ((await fetch(`${origin}/api/health`)).ok) break; } catch { /* Wait for the server to bind. */ }
        if (server.exitCode !== null || n === 99) throw new Error(`Test server failed: ${logs}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    await startServer();
    const request = (route, cookie) => fetch(`${origin}${route}`, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });
    async function begin() {
      const response = await request("/api/auth/google?adult=1");
      assert.equal(response.status, 307);
      const location = new URL(response.headers.get("location"));
      assert.equal(location.origin, "https://accounts.google.com");
      assert.equal(location.searchParams.get("redirect_uri"), `${origin}/api/auth/google/callback`);
      assert.equal(location.searchParams.get("scope"), "openid email profile");
      assert.equal(location.searchParams.get("prompt"), "select_account");
      assert.equal(location.searchParams.get("code_challenge_method"), "S256");
      assert.equal(response.headers.get("cache-control"), "no-store");
      const cookie = response.headers.getSetCookie().find((value) => value.startsWith("petnamora_google_oauth="));
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /Secure/i);
      assert.match(cookie, /SameSite=lax/i);
      assert.match(cookie, /Max-Age=600/i);
      assert.match(cookie, /Path=\/api\/auth\/google/i);
      return { cookie: cookie.split(";")[0], state: location.searchParams.get("state"), challenge: location.searchParams.get("code_challenge") };
    }
    async function callback(profile, options = {}) {
      const attempt = await begin();
      const code = randomUUID();
      grants.set(code, { ...attempt, profile, ...options });
      return request(`/api/auth/google/callback?${new URLSearchParams({ state: attempt.state, code })}`, attempt.cookie);
    }
    function sessionCookie(response) {
      return response.headers.getSetCookie().find((value) => value.startsWith("petnamora_session="))?.split(";")[0];
    }
    function expectError(response, code) {
      assert.equal(response.status, 307);
      assert.equal(response.headers.get("location"), `${origin}/?auth_error=${code}`);
      assert.equal(sessionCookie(response), undefined);
      assert.match(response.headers.get("set-cookie"), /petnamora_google_oauth=;.*Max-Age=0/);
    }
    const profile = { sub: "google-new-user", email: "new@gmail.com", email_verified: true, name: "Família Amora" };
    let newCookie;
    await t.test("requires an adult declaration and rejects missing, mismatched or malformed state before contacting Google", async () => {
      expectError(await request("/api/auth/google"), "adult_required");
      const attempt = await begin();
      const count = googleRequests;
      expectError(await request(`/api/auth/google/callback?code=forged&state=${attempt.state}`), "invalid_state");
      expectError(await request("/api/auth/google/callback?code=forged&state=wrong", attempt.cookie), "invalid_state");
      expectError(await request("/api/auth/google/callback?code=forged&state=wrong", "petnamora_google_oauth=malformed"), "invalid_state");
      assert.equal(googleRequests, count);
      assert.equal(await db.user.count(), 0);
    });
    await t.test("cancellation, missing code, token/profile errors and unverified email do not create accounts or sessions", async () => {
      const attempt = await begin();
      expectError(await request(`/api/auth/google/callback?state=${attempt.state}&error=access_denied`, attempt.cookie), "cancelled");
      expectError(await request(`/api/auth/google/callback?state=${attempt.state}`, attempt.cookie), "failed");
      expectError(await callback(profile, { tokenFailure: true }), "failed");
      expectError(await callback(profile, { profileFailure: true }), "failed");
      expectError(await callback({ ...profile, email_verified: false }), "email_not_verified");
      expectError(await callback({ ...profile, sub: "" }), "failed");
      assert.equal(await db.user.count(), 0);
      assert.equal(await db.session.count(), 0);
    });
    await t.test("new Google users get a revocable HttpOnly session without admin permissions or URL tokens", async () => {
      const response = await callback(profile);
      assert.equal(response.headers.get("location"), `${origin}/?auth=google`);
      newCookie = sessionCookie(response);
      assert.ok(newCookie);
      const cookie = response.headers.getSetCookie().find((value) => value.startsWith("petnamora_session="));
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /Secure/i);
      assert.match(cookie, /SameSite=lax/i);
      const { user } = await (await request("/api/auth", newCookie)).json();
      assert.equal(user.email, profile.email);
      assert.equal(user.name, profile.name);
      assert.equal(user.isAdmin, false);
      const record = await db.user.findUnique({ where: { googleId: profile.sub } });
      assert.equal(record.id, user.id);
      assert.equal(await bcrypt.compare("", record.passwordHash), false);
      const home = await request("/?auth=google", newCookie);
      assert.equal(home.status, 200);
      assert.match(await home.text(), /Família Amora/);
    });
    await t.test("repeat and concurrent callbacks reuse the stable Google identity, including changed provider email", async () => {
      const old = await db.user.findUnique({ where: { googleId: profile.sub } });
      for (const response of await Promise.all([callback(profile), callback({ ...profile, email: "renamed@gmail.com" })])) {
        const { user } = await (await request("/api/auth", sessionCookie(response))).json();
        assert.equal(user.id, old.id);
      }
      assert.equal(await db.user.count(), 1);
      const fresh = { ...profile, sub: "concurrent-new", email: "concurrent@gmail.com" };
      const responses = await Promise.all([callback(fresh), callback(fresh)]);
      assert.ok(responses.every(sessionCookie));
      assert.equal(await db.user.count({ where: { googleId: fresh.sub } }), 1);
    });
    const password = randomBytes(18).toString("hex");
    const passwordHash = await bcrypt.hash(password, 4);
    await t.test("existing Gmail accounts keep their password and identity when Google is linked", async () => {
      const existing = await db.user.create({ data: { name: "Conta existente", email: "existing@gmail.com", passwordHash } });
      const response = await callback({ ...profile, sub: "linked-existing", email: existing.email });
      const { user } = await (await request("/api/auth", sessionCookie(response))).json();
      assert.equal(user.id, existing.id);
      const updated = await db.user.findUnique({ where: { id: existing.id } });
      assert.equal(updated.googleId, "linked-existing");
      assert.equal(updated.passwordHash, passwordHash);
      const login = await fetch(`${origin}/api/auth`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email: existing.email, password }) });
      assert.equal(login.status, 200);
      assert.equal((await login.json()).user.id, existing.id);
    });
    await t.test("external email accounts require their existing password; Workspace addresses may link", async () => {
      const external = await db.user.create({ data: { name: "External", email: "existing@example.com", passwordHash } });
      expectError(await callback({ ...profile, sub: "external-sub", email: external.email }), "use_password");
      assert.equal((await db.user.findUnique({ where: { id: external.id } })).googleId, null);
      const response = await callback({ ...profile, sub: "workspace-sub", email: external.email, hd: "example.com" });
      assert.ok(sessionCookie(response));
      expectError(await callback({ ...profile, sub: "different-sub", email: external.email, hd: "example.com" }), "use_password");
    });
    await t.test("suspended accounts cannot sign in through Google or acquire a new link", async () => {
      await db.user.update({ where: { googleId: profile.sub }, data: { suspendedAt: new Date() } });
      const before = await db.session.count();
      expectError(await callback(profile), "account_suspended");
      await db.user.create({ data: { name: "Suspensa", email: "suspended@gmail.com", passwordHash, suspendedAt: new Date() } });
      expectError(await callback({ ...profile, sub: "suspended-sub", email: "suspended@gmail.com" }), "account_suspended");
      assert.equal(await db.session.count(), before);
      assert.equal((await (await request("/api/auth", newCookie)).json()).user, null);
    });
    await t.test("logout revokes Google sessions", async () => {
      const response = await callback({ ...profile, sub: "logout-sub", email: "logout@gmail.com" });
      const cookie = sessionCookie(response);
      const logout = await fetch(`${origin}/api/auth`, { method: "DELETE", headers: { Origin: origin, Cookie: cookie } });
      assert.equal(logout.status, 200);
      assert.equal((await (await request("/api/auth", cookie)).json()).user, null);
    });
    await t.test("missing credentials show a recoverable error and leave password login working", async () => {
      const exited = once(server, "exit");
      server.kill();
      await exited;
      await startServer({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" });
      expectError(await request("/api/auth/google?adult=1"), "not_configured");
      const login = await fetch(`${origin}/api/auth`, {
        method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: "existing@gmail.com", password }),
      });
      assert.equal(login.status, 200);
      assert.equal((await request("/?auth_error=not_configured")).status, 200);
      assert.equal((await request("/?auth_error=constructor")).status, 200);
    });
  } finally {
    if (server && server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
    google.closeAllConnections();
    await new Promise((resolve) => google.close(resolve));
    await db.$disconnect();
    await rootDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await rootDb.$disconnect();
  }
});
