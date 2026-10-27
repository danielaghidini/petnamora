import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
const target = path.resolve(".next/standalone");
await mkdir(path.join(target, ".next"), { recursive: true });
await cp(path.resolve(".next/static"), path.join(target, ".next/static"), { recursive: true });
await cp(path.resolve("public"), path.join(target, "public"), { recursive: true });
console.log("Standalone server prepared with static files and brand assets.");
