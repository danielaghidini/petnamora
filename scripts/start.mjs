import { spawn } from "node:child_process";
import path from "node:path";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const server = spawn(process.execPath, [path.resolve(".next/standalone/server.js")], {
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: process.env.PORT || "3003",
    HOSTNAME: process.env.APP_HOST || "127.0.0.1",
    UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || "uploads"),
  },
});
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
server.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { server.kill(signal); });
