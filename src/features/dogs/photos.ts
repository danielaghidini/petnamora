export const MAX_DOG_PHOTOS = 10;

export function dogPhotos(dog: { photoUrl: string; photoUrls?: string[] }) {
  return [...new Set([dog.photoUrl, ...(dog.photoUrls ?? [])].filter(Boolean))];
}

// Keep clients that still send only the cover from discarding an existing gallery.
export function photoData(
  input: { photoUrl: string; photoUrls?: string[] },
  existing?: { photoUrl: string; photoUrls?: string[] },
) {
  const photoUrls = input.photoUrls ?? [
    input.photoUrl,
    ...(existing ? dogPhotos(existing).filter((url) => url !== existing.photoUrl && url !== input.photoUrl) : []),
  ];
  return { photoUrl: photoUrls[0], photoUrls };
}
