export const DOG_BREEDS = [
  "Akita",
  "American Bully",
  "Basset Hound",
  "Beagle",
  "Bichon Frisé",
  "Border Collie",
  "Boston Terrier",
  "Boxer",
  "Bulldog Francês",
  "Bulldog Inglês",
  "Bull Terrier",
  "Cane Corso",
  "Chihuahua",
  "Chow Chow",
  "Cocker Spaniel",
  "Dachshund",
  "Dálmata",
  "Doberman",
  "Dogo Argentino",
  "Dogue Alemão",
  "Fila Brasileiro",
  "Golden Retriever",
  "Husky Siberiano",
  "Jack Russell Terrier",
  "Labrador",
  "Lhasa Apso",
  "Maltês",
  "Pastor Alemão",
  "Pastor Australiano",
  "Pastor Belga",
  "Pastor Suíço",
  "Pequinês",
  "Pinscher",
  "Pit Bull",
  "Poodle",
  "Pug",
  "Rottweiler",
  "Samoieda",
  "São Bernardo",
  "Schnauzer",
  "Sem raça definida (SRD)",
  "Shar-pei",
  "Shiba Inu",
  "Shih-tzu",
  "Spitz Alemão",
  "Staffordshire Bull Terrier",
  "Weimaraner",
  "West Highland White Terrier",
  "Whippet",
  "Yorkshire Terrier",
] as const;

export const OTHER_BREED = "other";

// Profiles created with the former free-text field can use these spellings.
const BREED_ALIASES: Record<string, readonly string[]> = {
  "Labrador": ["Labrador Retriever"],
  "Pit Bull": ["Pitbull", "American Pit Bull Terrier"],
  "Sem raça definida (SRD)": ["SRD", "Sem raça definida", "Vira-lata", "Vira lata"],
  "Shih-tzu": ["Shih Tzu"],
  "Spitz Alemão": ["Lulu da Pomerânia", "Spitz Alemão Anão"],
  "Yorkshire Terrier": ["Yorkshire"],
};

export function breedNames(breeds: readonly string[]) {
  return breeds.flatMap((breed) => [breed, ...(BREED_ALIASES[breed] ?? [])]);
}

function normalizeBreed(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchingBreed(value: string) {
  const normalized = normalizeBreed(value);
  return DOG_BREEDS.find((breed) => breedNames([breed]).some((name) => normalizeBreed(name) === normalized));
}

export function searchBreeds(query: string) {
  const normalized = normalizeBreed(query);
  return DOG_BREEDS.filter((breed) => breedNames([breed]).some((name) => normalizeBreed(name).includes(normalized)));
}

export function breedLabel(breed: string) {
  return breed === OTHER_BREED ? "Outros" : breed;
}
