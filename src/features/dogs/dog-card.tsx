"use client";
import { ArrowUpRight, Heart, MapPin, BadgeCheck, LoaderCircle, MessageCircle } from "lucide-react";
import type { DogProfile } from "./types";
import { ageLabel } from "./types";
export function DogCard({
  dog,
  liked,
  onLike,
  onOpen,
  busy,
  onMessage,
  messageBusy,
  messageDisabled,
}: {
  dog: DogProfile;
  liked: boolean;
  onLike: () => void;
  onOpen: () => void;
  busy?: boolean;
  onMessage?: () => void;
  messageBusy?: boolean;
  messageDisabled?: boolean;
}) {
  return (
    <article className="dog-card">
      <div className="dog-photo-wrap">
        <button
          className="dog-photo-button"
          onClick={onOpen}
          aria-label={`Ver perfil de ${dog.name}`}
        >
          <img
            className="dog-photo"
            src={dog.photoUrl}
            alt={`${dog.name}, ${dog.breed}`}
            loading="lazy"
          />
        </button>
        <span className={`sex-badge ${dog.sex === "MALE" ? "male" : "female"}`}>
          {dog.sex === "MALE" ? "♂ Macho" : "♀ Fêmea"}
        </span>
        <button
          className={`heart-button ${liked ? "is-liked" : ""}`}
          onClick={onLike}
          disabled={busy || liked}
          aria-label={
            liked ? `Coração já enviado para ${dog.name}` : `Curtir ${dog.name}`
          }
        >
          <Heart size={19} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="dog-card-body">
        <div className="dog-title">
          <h3>
            {dog.name} <span>{ageLabel(dog.ageMonths)}</span>
          </h3>
          <button
            className="small-link"
            onClick={onOpen}
            aria-label={`Detalhes de ${dog.name}`}
          >
            <ArrowUpRight size={19} />
          </button>
        </div>
        <p className="dog-breed">
          {dog.breed} <span>·</span> Porte {dog.size.toLowerCase()}
        </p>
        <p className="dog-location">
          <MapPin size={13} /> {dog.city}, {dog.state}
        </p>
        <div className="dog-tags">
          {dog.pedigree && (
            <span>
              <BadgeCheck size={12} /> Pedigree informado
            </span>
          )}
          {dog.vaccinated && (
            <span className="health-tag">Vacinas informadas</span>
          )}
          {!dog.pedigree && !dog.vaccinated && <span>Conheça esse amor</span>}
        </div>
        {onMessage && (
          <button type="button" className="secondary-button dog-message-button" onClick={onMessage}
            disabled={messageBusy || messageDisabled} aria-label={`Mandar mensagem para a família de ${dog.name}`}>
            {messageBusy ? <LoaderCircle size={17} className="spin" /> : <MessageCircle size={17} />}
            {messageBusy ? "Abrindo conversa…" : "Mandar mensagem"}
          </button>
        )}
      </div>
    </article>
  );
}
