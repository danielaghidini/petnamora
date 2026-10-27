import { z } from "zod";
import { isPhotoUrl } from "@/lib/photo-urls";
export const dogSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Conta o nome do seu cachorro (pelo menos 2 letras).")
    .max(50, "O nome pode ter até 50 caracteres."),
  breed: z
    .string()
    .trim()
    .min(2, "Conta a raça do seu cachorro.")
    .max(60, "Use até 60 caracteres para a raça."),
  sex: z.enum(["FEMALE", "MALE"], {
    error: "Seu cachorro é macho ou fêmea? Escolha uma opção.",
  }),
  ageMonths: z
    .number({ error: "Conta a idade do seu cachorro em meses." })
    .int("Informe a idade em meses inteiros.")
    .min(1, "A idade precisa ser de pelo menos 1 mês.")
    .max(240, "Confira a idade: o limite é de 240 meses."),
  size: z.enum(["Pequeno", "Médio", "Grande"], {
    error: "Escolha o porte do seu cachorro.",
  }),
  city: z
    .string()
    .trim()
    .min(2, "Em qual cidade vocês moram?")
    .max(80, "O nome da cidade pode ter até 80 caracteres."),
  state: z.enum(
    [
      "AC",
      "AL",
      "AP",
      "AM",
      "BA",
      "CE",
      "DF",
      "ES",
      "GO",
      "MA",
      "MT",
      "MS",
      "MG",
      "PA",
      "PB",
      "PR",
      "PE",
      "PI",
      "RJ",
      "RN",
      "RS",
      "RO",
      "RR",
      "SC",
      "SP",
      "SE",
      "TO",
    ],
    { error: "Escolha o estado onde vocês moram." },
  ),
  bio: z
    .string()
    .trim()
    .min(
      10,
      "Conta um pouquinho do jeitinho do seu cachorro (pelo menos 10 caracteres).",
    )
    .max(1000, "A apresentação pode ter até 1.000 caracteres."),
  photoUrl: z
    .string()
    .refine(isPhotoUrl, "Envie uma foto do seu cachorro."),
  pedigree: z.boolean(),
  vaccinated: z.boolean(),
  healthTests: z.boolean(),
  neutered: z.boolean(),
});
