"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { DOG_BREEDS, OTHER_BREED, breedLabel } from "./breeds";

function searchable(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function BreedFilter({
  value,
  onChange,
}: {
  value: string[];
  onChange: (breeds: string[]) => void;
}) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleBreeds = DOG_BREEDS.filter((breed) =>
    searchable(breed).includes(searchable(query.trim())),
  );
  const summary = value.length ? value.map(breedLabel).join(", ") : "Todas as raças";

  useEffect(() => {
    if (!open) return;
    function outsidePointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", outsidePointerDown);
    return () => document.removeEventListener("pointerdown", outsidePointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }
  function toggle(breed: string) {
    onChange(value.includes(breed)
      ? value.filter((selected) => selected !== breed)
      : [...value, breed]);
  }

  return (
    <div
      ref={container}
      className="search-field breed-filter"
      onBlur={(event) => {
        // Clicking a label or dragging the scrollbar can temporarily clear focus.
        // Only close here when focus actually moves to another control outside.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
          trigger.current?.focus();
        }
      }}
    >
      <span id={`${id}-label`}>Quais raças você procura?</span>
      <button
        ref={trigger}
        type="button"
        className="breed-filter-trigger"
        aria-labelledby={`${id}-label ${id}-summary`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
      >
        <Search size={18} aria-hidden="true" />
        <span id={`${id}-summary`}>
          {value.length > 1 ? `${value.length} raças selecionadas` : summary}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="breed-filter-panel" id={`${id}-panel`}>
          <label className="sr-only" htmlFor={`${id}-search`}>Buscar raça na lista</label>
          <input
            id={`${id}-search`}
            type="search"
            className="breed-filter-search"
            value={query}
            placeholder="Buscar raça na lista"
            maxLength={60}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />
          <p className="breed-filter-hint">Pode escolher mais de uma raça.</p>
          <div className="breed-filter-options" role="group" aria-labelledby={`${id}-label`}>
            {visibleBreeds.map((breed) => (
              <label className="breed-filter-option" key={breed}>
                <input type="checkbox" checked={value.includes(breed)} onChange={() => toggle(breed)} />
                <span>{breed}</span>
              </label>
            ))}
            {!visibleBreeds.length && <p className="breed-filter-hint">Raça fora da lista? Selecione Outros.</p>}
            <label className="breed-filter-option breed-filter-other">
              <input type="checkbox" checked={value.includes(OTHER_BREED)} onChange={() => toggle(OTHER_BREED)} />
              <span>Outros<small>Raças que não estão na lista</small></span>
            </label>
          </div>
          <div className="breed-filter-actions">
            <button type="button" className="text-button breed-filter-clear" onClick={() => onChange([])} disabled={!value.length}>Limpar</button>
            <button type="button" className="primary-button" onClick={() => { close(); trigger.current?.focus(); }}>Pronto</button>
          </div>
        </div>
      )}
    </div>
  );
}
