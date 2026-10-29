"use client";
import { ArrowUpRight, MapPin, BadgeCheck, Heart, LoaderCircle, Mars, MessageCircle, Venus } from "lucide-react";
import type { DogProfile } from "./types";
import { ageLabel } from "./types";
export function DogCard({
  dog,
  onOpen,
  onMessage,
  messageBusy,
  messageDisabled,
  onLike,
  liked,
  likeBusy,
  likeDisabled,
}: {
  dog: DogProfile;
  onOpen: () => void;
  onMessage?: () => void;
  messageBusy?: boolean;
  messageDisabled?: boolean;
  onLike?: () => void;
  liked?: boolean;
  likeBusy?: boolean;
  likeDisabled?: boolean;
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
          {dog.sex === "MALE" ? <Mars size={14} strokeWidth={3} aria-hidden="true" /> : <Venus size={14} strokeWidth={3} aria-hidden="true" />}
          {dog.sex === "MALE" ? "Macho" : "Fêmea"}
        </span>
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
        {(onMessage || onLike) && (
          <div className="dog-card-actions">
            {onMessage && (
              <button type="button" className="secondary-button" onClick={onMessage}
                disabled={messageBusy || messageDisabled} aria-label={`Mandar mensagem para a família de ${dog.name}`}>
                {messageBusy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <MessageCircle size={17} aria-hidden="true" />}
                {messageBusy ? "Abrindo…" : "Mensagem"}
              </button>
            )}
            {onLike && (
              <button type="button" className="primary-button" onClick={onLike}
                disabled={liked || likeBusy || likeDisabled} aria-pressed={!!liked}
                aria-label={liked ? `Curtida enviada para ${dog.name}` : `Curtir ${dog.name}`}>
                {likeBusy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <Heart size={17} fill={liked ? "currentColor" : "none"} aria-hidden="true" />}
                {likeBusy ? "Curtindo…" : liked ? "Curtido" : "Curtir"}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
