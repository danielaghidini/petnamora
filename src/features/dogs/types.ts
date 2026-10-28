export type DogProfile = {
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  sex: string;
  ageMonths: number;
  size: string;
  city: string;
  state: string;
  bio: string;
  photoUrl: string;
  pedigree: boolean;
  vaccinated: boolean;
  healthTests: boolean;
  neutered: boolean;
  active: boolean;
};
export type DiscoverPage = {
  dogs: DogProfile[];
  nextCursor: string | null;
};
export type Viewer = { id: string; name: string; email: string; isAdmin: boolean };
export type MatchProfile = {
  id: string;
  isMatch: boolean;
  dogA: DogProfile;
  dogB: DogProfile;
  messages: { text: string; createdAt: string }[];
};
export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
};
export function ageLabel(months: number) {
  const years = Math.floor(months / 12);
  return years
    ? `${years} ${years === 1 ? "ano" : "anos"}${months % 12 ? ` e ${months % 12}m` : ""}`
    : `${months} meses`;
}
