"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Heart, Info, LoaderCircle, MapPin, PawPrint, RotateCcw, X } from "lucide-react";
import { ageLabel, type DogProfile } from "./types";
import { swipeCandidates, swipeDirection, type LikeOutcome, type SwipeDirection } from "./swipe";

export function SwipeDiscover({
  dogs, likedDogs, activeDog, dogPicker, busy, loadingMore, nextCursor, loadMoreError,
  onLoadMore, onLike, onOpen, onEditFilters, onManageDogs,
}: {
  dogs: DogProfile[];
  likedDogs: DogProfile[];
  activeDog?: DogProfile;
  dogPicker: ReactNode;
  busy: boolean;
  loadingMore: boolean;
  nextCursor: string | null;
  loadMoreError: string;
  onLoadMore: () => Promise<void>;
  onLike: (dog: DogProfile) => Promise<LikeOutcome>;
  onOpen: (dog: DogProfile) => void;
  onEditFilters: () => void;
  onManageDogs: () => void;
}) {
  const [reviewed, setReviewed] = useState<Set<string>>(() => new Set());
  const [heldCard, setHeldCard] = useState<DogProfile | null>(null);
  const [exit, setExit] = useState<SwipeDirection | null>(null);
  const [sending, setSending] = useState(false);
  const [matched, setMatched] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const card = useRef<HTMLDivElement>(null);
  const emptyHeading = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedCursor = useRef<string | null>(null);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const remaining = swipeCandidates(dogs, reviewed, likedDogs, activeDog);
  const dog = heldCard ?? remaining[0];
  const unavailable = !!activeDog && (!activeDog.active || activeDog.neutered);
  const disabled = busy || sending || !!exit;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (nextCursor && remaining.length < 3 && !busy && !loadingMore && !loadMoreError && requestedCursor.current !== nextCursor) {
      requestedCursor.current = nextCursor;
      void onLoadMore();
    }
  }, [nextCursor, remaining.length, busy, loadingMore, loadMoreError, onLoadMore]);

  function resetGesture() {
    gesture.current = null;
    const element = card.current;
    if (!element) return;
    delete element.dataset.dragging;
    element.style.setProperty("--swipe-x", "0px");
    element.style.setProperty("--swipe-rotation", "0deg");
    element.style.setProperty("--swipe-like-opacity", "0");
    element.style.setProperty("--swipe-pass-opacity", "0");
  }

  async function decide(direction: SwipeDirection) {
    if (!dog || disabled || locked.current || (direction === "right" && unavailable)) return;
    locked.current = true;
    const current = dog;
    setHeldCard(current);
    resetGesture();
    if (direction === "right") {
      setSending(true);
      let outcome: LikeOutcome = false;
      try {
        outcome = await onLike(current);
      } catch {
        if (mounted.current) setAnnouncement("O coraçãozinho não foi. Tente novamente.");
      }
      if (!mounted.current) return;
      setSending(false);
      if (!outcome) {
        setHeldCard(null);
        locked.current = false;
        return;
      }
      setMatched(outcome === "matched");
      setAnnouncement(outcome === "matched" ? `Deu namorinho com ${current.name}!` : `Coração enviado para ${current.name}.`);
    } else {
      setAnnouncement(`Você passou o perfil de ${current.name}.`);
    }
    setExit(direction);
    timer.current = setTimeout(() => {
      const keepCardFocus = document.activeElement === card.current;
      setReviewed((previous) => new Set(previous).add(current.id));
      setHeldCard(null);
      setExit(null);
      setMatched(false);
      locked.current = false;
      timer.current = null;
      if (keepCardFocus) requestAnimationFrame(() => {
        if (mounted.current) (card.current ?? emptyHeading.current)?.focus({ preventScroll: true });
      });
    }, 220);
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || locked.current || event.button !== 0) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) < 10 || Math.abs(x) <= Math.abs(y) * 1.15) return;
    const element = event.currentTarget;
    element.dataset.dragging = "true";
    const offset = Math.max(-element.clientWidth, Math.min(element.clientWidth, x));
    element.style.setProperty("--swipe-x", `${offset}px`);
    element.style.setProperty("--swipe-rotation", `${Math.max(-16, Math.min(16, offset / 18))}deg`);
    element.style.setProperty("--swipe-like-opacity", String(Math.min(1, Math.max(0, x / 100))));
    element.style.setProperty("--swipe-pass-opacity", String(Math.min(1, Math.max(0, -x / 100))));
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y, event.currentTarget.clientWidth);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    resetGesture();
    if (direction) void decide(direction);
  }

  return (
    <section className="swipe-discover" aria-label="Modo crush">
      <div className="swipe-toolbar">
        {dogPicker || <span>{activeDog ? `Um crush para ${activeDog.name}` : "Um coração de cada vez"}</span>}
        <span className="swipe-counter">{reviewed.size} {reviewed.size === 1 ? "perfil visto" : "perfis vistos"}</span>
      </div>
      {unavailable && <div className="swipe-unavailable">
        <p>O perfil de {activeDog.name} está indisponível para namorinho. Escolha outro cachorro para enviar um coração.</p>
        <button className="text-button" onClick={onManageDogs}>Ver meus cachorros</button>
      </div>}
      <div className="swipe-stage" aria-busy={busy || sending || loadingMore}>
        {busy ? (
          <div className="swipe-empty"><LoaderCircle className="spin" size={30} /><h2>Os crushes estão chegando…</h2></div>
        ) : dog ? (
          <>
            <div className="swipe-stack" aria-hidden="true" />
            <div
              key={dog.id}
              ref={card}
              className="swipe-card"
              data-exit={exit || undefined}
              data-sending={sending || undefined}
              tabIndex={0}
              role="group"
              aria-label={`Perfil de ${dog.name}, ${dog.breed}, ${ageLabel(dog.ageMonths)}`}
              aria-describedby="swipe-instructions"
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={resetGesture}
              onLostPointerCapture={resetGesture}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || event.repeat) return;
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  void decide(event.key === "ArrowLeft" ? "left" : "right");
                }
              }}
            >
              <img className="swipe-photo" src={dog.photoUrl} alt={`${dog.name}, ${dog.breed}`} draggable={false} />
              <span className={`sex-badge ${dog.sex === "MALE" ? "male" : "female"}`}>{dog.sex === "MALE" ? "♂ Macho" : "♀ Fêmea"}</span>
              <span className="swipe-stamp swipe-stamp-pass" aria-hidden="true">PRÓXIMO</span>
              <span className="swipe-stamp swipe-stamp-like" aria-hidden="true">{matched ? "DEU NAMORINHO!" : "CURTI!"}</span>
              <div className="swipe-card-copy">
                <h2>{dog.name} <span>{ageLabel(dog.ageMonths)}</span></h2>
                <p>{dog.breed} · Porte {dog.size.toLowerCase()}</p>
                <p className="swipe-location"><MapPin size={15} /> {dog.city}, {dog.state}</p>
                <div className="swipe-tags">
                  {dog.pedigree && <span><BadgeCheck size={14} /> Pedigree informado</span>}
                  {dog.vaccinated && <span>Vacinas informadas</span>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="swipe-empty">
            {loadingMore ? <LoaderCircle className="spin" size={32} /> : <PawPrint size={42} />}
            <h2 ref={emptyHeading} tabIndex={-1}>{loadingMore ? "Buscando mais crushes…" : reviewed.size ? "Você chegou ao fim da rodada!" : "Os próximos crushes estão por vir"}</h2>
            <p>{loadingMore ? "Já já aparece outro focinho por aqui." : "Tente outros filtros ou volte depois para conhecer novos cachorros."}</p>
            {!loadingMore && <div className="swipe-empty-actions">
              {!!nextCursor && <button className="primary-button" onClick={() => void onLoadMore()}>Buscar mais crushes</button>}
              {reviewed.size > 0 && <button className="secondary-button" onClick={() => { setReviewed(new Set()); setAnnouncement("Nova rodada! Os perfis que você passou voltaram para a fila."); }}><RotateCcw size={16} /> Recomeçar rodada</button>}
              <button className="text-button" onClick={onEditFilters}>Ajustar filtros</button>
            </div>}
          </div>
        )}
      </div>
      {dog && !busy && <div className="swipe-actions">
        <div><button type="button" className="swipe-action swipe-pass" disabled={disabled} onClick={() => void decide("left")} aria-label={`Passar ${dog.name}`}><X size={29} /></button><span>Passar</span></div>
        <div><button type="button" className="swipe-action swipe-info" disabled={disabled} onClick={() => onOpen(dog)} aria-label={`Ver perfil de ${dog.name}`}><Info size={23} /></button><span>Conhecer</span></div>
        <div><button type="button" className="swipe-action swipe-like" disabled={disabled || unavailable} onClick={() => void decide("right")} aria-label={`Curtir ${dog.name}`}>{sending ? <LoaderCircle className="spin" size={29} /> : <Heart size={29} fill="currentColor" />}</button><span>Curtir</span></div>
      </div>}
      <p className="swipe-instructions" id="swipe-instructions"><ArrowLeft size={15} /> Esquerda: passar <span>·</span> Direita: curtir <ArrowRight size={15} /></p>
      <p className="swipe-keyboard-hint">Arraste o cartão ou use os botões. No teclado, use as setas com o cartão em foco.</p>
      {loadMoreError && <div className="swipe-load-error" role="alert"><p>{loadMoreError}</p><button className="text-button" disabled={loadingMore} onClick={() => void onLoadMore()}>Tentar de novo</button></div>}
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
    </section>
  );
}
