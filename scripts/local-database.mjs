import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

// A separate local cluster; never reads or modifies the Meu Site Perfeito database.
const root = process.cwd();
const data = path.join(root, ".local", "postgres", "data");
const fallback = path.join(
  process.env.LOCALAPPDATA || "",
  "MeuSitePerfeito",
  "postgresql-17",
  "pgsql",
  "bin",
);
const bin = process.env.PG_BIN || fallback;
const suffix = process.platform === "win32" ? ".exe" : "";
function run(command, args, env = process.env) {
  const result = spawnSync(path.join(bin, `${command}${suffix}`), args, {
    encoding: "utf8",
    windowsHide: true,
    env,
    stdio: command === "pg_ctl" ? "ignore" : ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0)
    throw new Error(
      result.error?.message ||
        result.stderr ||
        result.stdout ||
        `${command} failed`,
    );
  return result.stdout;
}
try {
  fs.mkdirSync(path.dirname(data), { recursive: true });
  const envPath = path.join(root, ".env");
  let password;
  if (!fs.existsSync(path.join(data, "PG_VERSION"))) {
    if (fs.existsSync(envPath))
      throw new Error(
        ".env already exists. Configure DATABASE_URL manually or use your existing database.",
      );
    password = randomBytes(24).toString("hex");
    const passwordFile = path.join(
      os.tmpdir(),
      `petnamora-${randomBytes(8).toString("hex")}.txt`,
    );
    try {
      fs.writeFileSync(passwordFile, password, { mode: 0o600, flag: "wx" });
      run("initdb", [
        "-D",
        data,
        "-U",
        "petnamora",
        "--encoding=UTF8",
        "--locale=C",
        "--auth=scram-sha-256",
        `--pwfile=${passwordFile}`,
      ]);
      fs.writeFileSync(
        envPath,
        `DATABASE_URL="postgresql://petnamora:${password}@127.0.0.1:5437/petnamora?schema=public"\nJWT_SECRET="${randomBytes(48).toString("hex")}"\nAPP_URL="http://localhost:3003"\nUPLOAD_DIR="./uploads"\n`,
        { mode: 0o600, flag: "wx" },
      );
    } finally {
      fs.rmSync(passwordFile, { force: true });
    }
  }
  if (!fs.existsSync(envPath))
    throw new Error(
      "Restore .env with this cluster's credentials before continuing.",
    );
  const status = spawnSync(
    path.join(bin, `pg_ctl${suffix}`),
    ["status", "-D", data],
    { windowsHide: true, encoding: "utf8" },
  );
  if (status.status !== 0)
    run("pg_ctl", [
      "start",
      "-D",
      data,
      "-l",
      path.join(root, ".local", "postgres", "server.log"),
      "-o",
      "-p 5437 -h 127.0.0.1",
      "-w",
    ]);
  const databaseUrl = new URL(
    /DATABASE_URL="([^"]+)"/.exec(fs.readFileSync(envPath, "utf8"))[1],
  );
  if (
    databaseUrl.hostname !== "127.0.0.1" ||
    databaseUrl.port !== "5437" ||
    databaseUrl.pathname !== "/petnamora"
  )
    throw new Error("db:local only operates on 127.0.0.1:5437/petnamora.");
  const pgEnv = {
    ...process.env,
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
  };
  const exists = run(
    "psql",
    [
      "-h",
      "127.0.0.1",
      "-p",
      "5437",
      "-U",
      "petnamora",
      "-d",
      "postgres",
      "-tAc",
      "SELECT 1 FROM pg_database WHERE datname='petnamora'",
    ],
    pgEnv,
  ).trim();
  if (!exists)
    run(
      "createdb",
      [
        "-h",
        "127.0.0.1",
        "-p",
        "5437",
        "-U",
        "petnamora",
        "-E",
        "UTF8",
        "petnamora",
      ],
      pgEnv,
    );
  console.log(
    "Pet Namora PostgreSQL ready on 127.0.0.1:5437. Local secrets saved in ignored .env.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
