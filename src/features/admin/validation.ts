import { z } from "zod";

const common = {
  id: z.string().min(1).max(100),
  reason: z.string().trim().min(5, "Descreva o motivo com pelo menos 5 caracteres.").max(1000),
};
const reportStatus = z.enum(["OPEN", "RESOLVED", "DISMISSED"]);
export const adminChangeSchema = z.discriminatedUnion("kind", [
  z.object({ ...common, kind: z.literal("user"), value: z.boolean(), expected: z.boolean() }).strict(),
  z.object({ ...common, kind: z.literal("user-delete"), expected: z.boolean() }).strict(),
  z.object({ kind: z.literal("photo-cleanup"), reason: common.reason }).strict(),
  z.object({ ...common, kind: z.literal("dog"), value: z.boolean(), expected: z.boolean() }).strict(),
  z.object({ ...common, kind: z.literal("report"), value: reportStatus, expected: reportStatus }).strict(),
]);
export type AdminChange = z.infer<typeof adminChangeSchema>;
export type AdminCommand = Omit<Extract<AdminChange, { kind: "user" }>, "reason"> |
  Omit<Extract<AdminChange, { kind: "user-delete" }>, "reason"> |
  Omit<Extract<AdminChange, { kind: "photo-cleanup" }>, "reason"> |
  Omit<Extract<AdminChange, { kind: "dog" }>, "reason"> |
  Omit<Extract<AdminChange, { kind: "report" }>, "reason">;

export const reportLabels = { OPEN: "Pendente", RESOLVED: "Concluída", DISMISSED: "Arquivada" } as const;
