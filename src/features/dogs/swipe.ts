import type { DogProfile } from "./types";

export type SwipeDirection = "left" | "right";
export type LikeOutcome = "liked" | "matched" | false;

export function swipeCandidates(
  dogs: DogProfile[],
  reviewed: ReadonlySet<string>,
  liked: DogProfile[],
  activeDog?: DogProfile,
) {
  const likedIds = new Set(liked.map((dog) => dog.id));
  return dogs.filter((dog) =>
    dog.active && !dog.neutered && !reviewed.has(dog.id) && !likedIds.has(dog.id) &&
    (!activeDog || (dog.ownerId !== activeDog.ownerId && dog.sex !== activeDog.sex)),
  );
}

export function swipeDirection(x: number, y: number, width: number): SwipeDirection | null {
  const threshold = Math.min(100, Math.max(60, width * 0.24));
  if (Math.abs(x) < threshold || Math.abs(x) <= Math.abs(y) * 1.15) return null;
  return x > 0 ? "right" : "left";
}
