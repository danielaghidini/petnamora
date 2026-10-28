import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Opt-in fixture load through the same authenticated APIs as the application.
// No database credentials, deployments or changes to existing profiles are needed.
const people = [
  "Mariana Almeida", "Lucas Ribeiro", "Camila Ferreira", "Rafael Costa", "Juliana Martins",
  "Bruno Oliveira", "Fernanda Souza", "Thiago Pereira", "Beatriz Lima", "Gustavo Rocha",
  "Amanda Carvalho", "Felipe Santos", "Larissa Gomes", "Henrique Barbosa", "Patrícia Azevedo",
  "Diego Moreira", "Isabela Cardoso", "Rodrigo Teixeira", "Carolina Nunes", "André Monteiro",
  "Letícia Castro", "Vinícius Melo", "Gabriela Duarte", "Eduardo Fernandes", "Natália Lopes",
  "Leonardo Campos", "Priscila Mendes", "Caio Batista", "Renata Correia", "Marcelo Vieira",
  "Aline Ramos", "Daniel Freitas", "Vanessa Andrade", "Pedro Cunha", "Bianca Rezende",
  "Ricardo Farias", "Débora Guimarães", "Matheus Borges", "Luana Tavares", "Alexandre Dias",
  "Sabrina Pires", "Igor Macedo", "Thaís Peixoto", "Renan Silveira", "Jéssica Coelho",
  "Fábio Amaral", "Vitória Assis", "Samuel Braga", "Clara Miranda", "Otávio Barros",
];
const femaleNames = ["Mel", "Luna", "Amora", "Nina", "Bella", "Maya", "Lola", "Jade", "Cacau", "Frida", "Pérola", "Kiara", "Flora", "Paçoca", "Malu", "Pipoca", "Dora", "Liz", "Atena", "Lili", "Olívia", "Meg", "Aurora", "Chloe", "Duda"];
const maleNames = ["Thor", "Bento", "Theo", "Simba", "Luke", "Chico", "Bob", "Toby", "Ozzy", "Max", "Fred", "Hulk", "Paco", "Billy", "Zeca", "Apolo", "Nico", "Oliver", "Romeu", "Tom", "Boris", "Bruce", "Dom", "Cookie", "Otto"];
const breeds = [
  ["Golden Retriever", "retriever/golden", "Grande", "Brincar com bolinha e passear no parque são os programas favoritos por aqui."],
  ["Labrador", "labrador", "Grande", "Água, quintal e companhia da família fazem qualquer dia ficar melhor."],
  ["Beagle", "beagle", "Médio", "Cada passeio é uma aventura, com muita curiosidade e tempo para farejar tudo."],
  ["Shih-tzu", "shihtzu", "Pequeno", "Adora ficar perto da família, ganhar carinho e observar o movimento da janela."],
  ["Spitz Alemão", "pomeranian", "Pequeno", "Tem uma personalidade enorme, ama atenção e acompanha a família pela casa inteira."],
  ["Pug", "pug", "Pequeno", "Prefere passeios tranquilos, colo e uma boa soneca perto de quem ama."],
  ["Husky Siberiano", "husky", "Grande", "Tem energia de sobra e adora passeios longos nas horas mais fresquinhas do dia."],
  ["Border Collie", "collie/border", "Médio", "Aprende brincadeiras rapidinho e se diverte com desafios e atividades ao ar livre."],
  ["Dachshund", "dachshund", "Pequeno", "Curte explorar o jardim e depois descansar bem juntinho da família."],
  ["Pastor Alemão", "german/shepherd", "Grande", "É muito apegado à rotina da família e gosta de passear e brincar todos os dias."],
];
const cities = [["Goiânia", "GO"], ["Trindade", "GO"], ["Aparecida de Goiânia", "GO"], ["São Paulo", "SP"], ["Campinas", "SP"], ["Rio de Janeiro", "RJ"], ["Belo Horizonte", "MG"], ["Curitiba", "PR"], ["Brasília", "DF"], ["Florianópolis", "SC"]];
const endings = [
  "Estamos procurando uma família que goste de conversar e conhecer os cachorros com calma.",
  "Por aqui, o primeiro passo é trocar uma ideia e combinar um passeio para se conhecerem.",
  "Queremos conhecer famílias da região que tenham o mesmo cuidado com seus cachorros.",
  "Gostamos de respeitar o tempo de cada cachorro e conversar sobre todos os cuidados antes de combinar um encontro.",
  "Se o jeitinho combinar, vamos adorar marcar um passeio em um lugar tranquilo.",
];
const slug = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replaceAll(" ", ".");
export const profiles = people.map((ownerName, i) => {
  const [breed, photoBreed, size, personality] = breeds[Math.floor(i / 5)];
  const [city, state] = cities[Math.floor(i / 2) % cities.length];
  const sex = i % 2 === 0 ? "FEMALE" : "MALE";
  const name = (sex === "FEMALE" ? femaleNames : maleNames)[Math.floor(i / 2)];
  return {
    ownerName,
    // Reserved domain: these fictional identities cannot reach real mailboxes.
    email: `${slug(ownerName)}@example.com`,
    photoBreed,
    dog: { name, breed, sex, ageMonths: 24 + ((i * 7) % 49), size, city, state,
      bio: `${name} mora com a gente em ${city}. ${personality} ${endings[i % endings.length]}`,
      pedigree: i % 3 !== 0, vaccinated: i % 7 !== 0, healthTests: i % 4 === 0,
      neutered: false,
    },
  };
});

async function main() {
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ count: profiles.length, profiles }, null, 2));
    return;
  }
  const urlArgument = process.argv.find((arg) => arg.startsWith("--url="));
  if (!urlArgument) throw new Error("Informe explicitamente --url=https://petnamora.com.br (ou a URL local desejada).");
  const base = new URL(urlArgument.slice(6));
  if (base.pathname !== "/" || base.username || base.password || base.search || base.hash)
    throw new Error("Use somente a origem do site, sem caminho, parâmetros ou credenciais.");
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname))
    throw new Error("A carga remota exige HTTPS.");
  const directory = path.resolve(".local", "profile-seeds", base.host.replaceAll(":", "_"));
  await mkdir(directory, { recursive: true });
  const manifestPath = path.join(directory, "accounts.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    manifest = { origin: base.origin, createdAt: new Date().toISOString(), accounts: profiles.map((profile) => ({ email: profile.email, password: randomBytes(24).toString("base64url") })) };
  }
  if (manifest.origin !== base.origin || manifest.accounts.length !== profiles.length || manifest.accounts.some((account, i) => account.email !== profiles[i].email))
    throw new Error("O manifesto não corresponde à origem ou ao conjunto de perfis.");
  async function save() {
    await writeFile(`${manifestPath}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    await rename(`${manifestPath}.tmp`, manifestPath);
    const quote = (value) => `'${value.replaceAll("'", "''")}'`;
    const lines = ["-- Executar somente no banco desta origem: " + base.origin,
      "-- Remove apenas os IDs desta carga. As relações seguem os cascades do schema.", "BEGIN;"];
    for (const account of manifest.accounts) {
      if (account.dogId && account.userId)
        lines.push(`DELETE FROM "Dog" WHERE id = ${quote(account.dogId)} AND "ownerId" = ${quote(account.userId)};`);
      if (account.userId)
        lines.push(`DELETE FROM "User" WHERE id = ${quote(account.userId)} AND email = ${quote(account.email)} AND NOT EXISTS (SELECT 1 FROM "Dog" WHERE "ownerId" = ${quote(account.userId)});`);
    }
    lines.push("COMMIT;", "");
    await writeFile(path.join(directory, "remove.sql"), lines.join("\n"), { mode: 0o600 });
  }
  await save(); // Save passwords BEFORE registering, so an interrupted run is resumable.
  async function request(endpoint, { cookie, body, method = "GET" } = {}) {
    const response = await fetch(new URL(endpoint, base), {
      method, headers: { Origin: base.origin, ...(cookie ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(`${endpoint} (${response.status}): ${data.error || "Resposta inesperada"}`), { status: response.status });
    return { data, cookie: response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ") };
  }
  const { data: initial } = await request("/api/dogs");
  const visibleIds = new Set(initial.dogs.map((dog) => dog.id));
  let created = 0;
  for (const [i, profile] of profiles.entries()) {
    const account = manifest.accounts[i];
    if (account.dogId && visibleIds.has(account.dogId)) continue;
    let session;
    // An unknown email conflict is never adopted or overwritten: login must prove ownership.
    try {
      session = await request("/api/auth", { method: "POST", body: { action: "login", email: account.email, password: account.password } });
    } catch (error) {
      if (error.status !== 401) throw error;
      session = await request("/api/auth", { method: "POST", body: { action: "register", name: profile.ownerName, email: account.email, password: account.password } });
    }
    account.userId = session.data.user.id;
    await save();
    const cookie = session.cookie;
    if (!cookie) throw new Error("O servidor não retornou uma sessão.");
    try {
      const { data: mine } = await request("/api/dogs?mine=true", { cookie });
      const existing = mine.dogs.find((dog) => dog.id === account.dogId || (dog.name === profile.dog.name && dog.breed === profile.dog.breed));
      if (existing) {
        account.dogId = existing.id;
        account.photoUrl = existing.photoUrl;
        await save();
        continue;
      }
      if (!account.photoSource) {
        const response = await fetch(`https://dog.ceo/api/breed/${profile.photoBreed}/images`, { signal: AbortSignal.timeout(30_000) });
        const photos = await response.json();
        if (!response.ok || photos.status !== "success" || !Array.isArray(photos.message)) throw new Error(`Fotos indisponíveis para ${profile.dog.breed}.`);
        const used = new Set(manifest.accounts.map((item) => item.photoSource));
        // Spread selection over the gallery, preserving a different image for each dog.
        const candidates = photos.message.filter((url) => /^https:\/\/images\.dog\.ceo\//.test(url) && !used.has(url));
        if (!candidates.length) throw new Error("Não há fotos únicas disponíveis.");
        account.photoSource = candidates[Math.floor((i % 5 + 0.5) * candidates.length / 5)];
        await save();
      }
      if (!account.photoUrl) {
        const response = await fetch(account.photoSource, { signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error(`Falha ao baixar foto: ${response.status}.`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 5 * 1024 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff)
          throw new Error("A foto precisa ser JPEG e ter até 5 MB.");
        const form = new FormData();
        form.set("image", new Blob([bytes], { type: "image/jpeg" }), "portrait.jpg");
        const { data: upload } = await request("/api/upload", { method: "POST", cookie, body: form });
        account.photoUrl = upload.url;
        await save();
      }
      const { data } = await request("/api/dogs", { method: "POST", cookie, body: { ...profile.dog, photoUrl: account.photoUrl } });
      account.dogId = data.dog.id;
      await save();
      created++;
      console.log(`${i + 1}/${profiles.length}: ${profile.ownerName} — ${profile.dog.name}, ${profile.dog.breed}, ${profile.dog.city}/${profile.dog.state}`);
    } finally {
      await request("/api/auth", { method: "DELETE", cookie });
    }
  }
  // Report visibility separately: public search only returns the latest 60 profiles.
  const { data: final } = await request("/api/dogs");
  const displayed = manifest.accounts.filter((account) => final.dogs.some((dog) => dog.id === account.dogId)).length;
  if (manifest.accounts.some((account) => !account.dogId)) throw new Error("A carga ficou incompleta; execute novamente para retomar.");
  console.log(JSON.stringify({ origin: base.origin, accounts: manifest.accounts.length, dogs: manifest.accounts.filter((account) => account.dogId).length, created, visible: displayed, credentials: manifestPath, removal: path.join(directory, "remove.sql") }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
