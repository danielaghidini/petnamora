import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient();
const photos = {
  golden:
    "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=85",
  border:
    "https://images.unsplash.com/photo-1551717743-49959800b1f6?auto=format&fit=crop&w=800&q=85",
  corgi:
    "https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=800&q=85",
  husky:
    "https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=800&q=85",
  dog: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=85",
  retriever:
    "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?auto=format&fit=crop&w=800&q=85",
};
const examples = [
  {
    id: "demo-amora",
    name: "Amora",
    breed: "Golden Retriever",
    sex: "FEMALE",
    ageMonths: 30,
    size: "Grande",
    city: "Campinas",
    state: "SP",
    photoUrl: photos.golden,
    pedigree: true,
    vaccinated: true,
  },
  {
    id: "demo-theo",
    name: "Theo",
    breed: "Border Collie",
    sex: "MALE",
    ageMonths: 36,
    size: "Médio",
    city: "São Paulo",
    state: "SP",
    photoUrl: photos.border,
    pedigree: true,
    vaccinated: true,
  },
  {
    id: "demo-luna",
    name: "Luna",
    breed: "Welsh Corgi",
    sex: "FEMALE",
    ageMonths: 26,
    size: "Pequeno",
    city: "Jundiaí",
    state: "SP",
    photoUrl: photos.corgi,
    pedigree: false,
    vaccinated: true,
  },
  {
    id: "demo-bento",
    name: "Bento",
    breed: "Golden Retriever",
    sex: "MALE",
    ageMonths: 40,
    size: "Grande",
    city: "Santos",
    state: "SP",
    photoUrl: photos.retriever,
    pedigree: true,
    vaccinated: true,
  },
  {
    id: "demo-maya",
    name: "Maya",
    breed: "Husky Siberiano",
    sex: "FEMALE",
    ageMonths: 36,
    size: "Grande",
    city: "Curitiba",
    state: "PR",
    photoUrl: photos.husky,
    pedigree: true,
    vaccinated: false,
  },
  {
    id: "demo-pipoca",
    name: "Pipoca",
    breed: "Beagle",
    sex: "MALE",
    ageMonths: 28,
    size: "Médio",
    city: "Sorocaba",
    state: "SP",
    photoUrl: photos.dog,
    pedigree: false,
    vaccinated: true,
  },
];
try {
  const demo = await db.user.upsert({
    where: { email: "demo@petnamora.invalid" },
    create: {
      name: "Perfis de demonstração",
      email: "demo@petnamora.invalid",
      passwordHash: await bcrypt.hash(randomBytes(48).toString("hex"), 12),
    },
    update: {},
  });
  // Idempotent seed: no known demo credentials, invented users or fake conversations.
  for (const example of examples)
    await db.dog.upsert({
      where: { id: example.id },
      create: {
        ...example,
        ownerId: demo.id,
        demo: true,
        healthTests: false,
        bio: "Este é um perfil de exemplo para conhecer o Pet Namora. As informações de raça, idade, localização e saúde são fictícias. A foto é ilustrativa e este cão não está disponível para conexão.",
      },
      update: {},
    });
  console.log(
    "6 clearly labeled example profiles ready. No demo login or fabricated matches.",
  );
} finally {
  await db.$disconnect();
}
