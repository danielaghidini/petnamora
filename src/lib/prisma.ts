import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { petNamoraDb?: PrismaClient };
export const db = globalDb.petNamoraDb ?? new PrismaClient();
globalDb.petNamoraDb = db;
