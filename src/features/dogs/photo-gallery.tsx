"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dogPhotos } from "./photos";
import type { DogProfile } from "./types";

export function PhotoGallery({ dog }: { dog: DogProfile }) {
  const photos = dogPhotos(dog);
  const [selected, setSelected] = useState(0);
  const index = selected < photos.length ? selected : 0;

  return (
    <div className="dog-gallery" role="region" aria-label={`Fotos de ${dog.name}`}>
      <div className="dog-gallery-main">
        <img className="detail-photo" src={photos[index]} alt={`${dog.name}, foto ${index + 1} de ${photos.length}`} />
        {photos.length > 1 && <>
          <button type="button" className="gallery-arrow gallery-prev" aria-label="Foto anterior"
            onClick={() => setSelected((index + photos.length - 1) % photos.length)}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" className="gallery-arrow gallery-next" aria-label="Próxima foto"
            onClick={() => setSelected((index + 1) % photos.length)}><ChevronRight aria-hidden="true" /></button>
          <span className="gallery-counter" role="status">{index + 1} / {photos.length}</span>
        </>}
      </div>
      {photos.length > 1 && <div className="dog-gallery-thumbs">
        {photos.map((url, photoIndex) => <button type="button" key={url} aria-label={`Ver foto ${photoIndex + 1} de ${dog.name}`}
          aria-pressed={photoIndex === index} onClick={() => setSelected(photoIndex)}>
          <img src={url} alt="" loading="lazy" />
        </button>)}
      </div>}
    </div>
  );
}
