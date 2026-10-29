import { z } from "zod";

export const passwordSchema = z.string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter até 72 caracteres.")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Essa senha ficou comprida demais. Tente uma um pouco menor.",
  );
