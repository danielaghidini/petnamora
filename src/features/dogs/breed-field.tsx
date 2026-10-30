"use client";

import { useId, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { DOG_BREEDS, OTHER_BREED, matchingBreed, searchBreeds } from "./breeds";

export function BreedField({ defaultValue = "" }: { defaultValue?: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const customInput = useRef<HTMLInputElement>(null);
  const customRequested = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [custom, setCustom] = useState(() => !!defaultValue && !matchingBreed(defaultValue));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const selected = custom ? OTHER_BREED : matchingBreed(value);
  const options: string[] = [...searchBreeds(query), OTHER_BREED];

  function choose(breed: string) {
    if (breed === OTHER_BREED) {
      if (!custom) setValue("");
      setCustom(true);
      customRequested.current = true;
    } else {
      setCustom(false);
      setValue(breed);
    }
    setInvalid(false);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="form-field breed-field">
      <label htmlFor={`${id}-trigger`}>Raça</label>
      {/* Own the scroll lock so the parent dialog allows touch scrolling in this portal. */}
      <Popover.Root modal open={open} onOpenChange={(next) => { setOpen(next); setQuery(""); setActiveIndex(0); }}>
        <Popover.Trigger asChild>
          <button ref={trigger} id={`${id}-trigger`} type="button" className="select-trigger breed-picker-trigger"
            role="combobox" aria-expanded={open} aria-controls={`${id}-dialog`} aria-haspopup="dialog"
            aria-label="Raça" aria-required="true" aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${id}-error` : undefined} data-placeholder={!value && !custom ? "" : undefined}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault(); setOpen(true); setQuery(""); setActiveIndex(0);
              }
            }}>
            <Search size={18} aria-hidden="true" />
            <span>{custom ? "Outros" : value || "Selecione a raça"}</span>
            <ChevronDown size={17} aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content ref={panel} id={`${id}-dialog`} className="breed-picker-panel" sideOffset={6} collisionPadding={12} aria-label="Escolher raça"
            tabIndex={-1}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              // Keep the mobile keyboard closed until the user chooses to search.
              if (window.matchMedia("(pointer: coarse)").matches) panel.current?.focus();
              else search.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              if (customRequested.current) {
                event.preventDefault();
                customRequested.current = false;
                requestAnimationFrame(() => customInput.current?.focus());
              }
            }}>
            <label className="sr-only" htmlFor={`${id}-search`}>Buscar raça na lista</label>
            <input ref={search} id={`${id}-search`} className="breed-picker-search" type="search"
              role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls={`${id}-list`}
              aria-activedescendant={`${id}-option-${activeIndex}`} placeholder="Buscar raça na lista"
              value={query} maxLength={60}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  choose(options[activeIndex]);
                } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const next = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                  setActiveIndex(next);
                  list.current?.querySelectorAll<HTMLElement>('[role="option"]')[next]?.scrollIntoView({ block: "nearest" });
                }
              }} />
            <p className="breed-filter-hint">Escolha a raça do seu cachorro.</p>
            <div ref={list} id={`${id}-list`} className="breed-picker-options" role="listbox" aria-label="Raças">
              {options.map((breed, index) => (
                <button key={breed} type="button" role="option" tabIndex={-1} id={`${id}-option-${index}`}
                  aria-selected={selected === breed} className="breed-picker-option" data-highlighted={index === activeIndex || undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={(event) => { if (event.pointerType === "mouse") setActiveIndex(index); }}
                  onClick={() => choose(breed)}>
                  <span>{breed === OTHER_BREED ? "Outros" : breed}{breed === OTHER_BREED && <small>Raça que não está na lista</small>}</span>
                  {selected === breed && <Check size={18} aria-hidden="true" />}
                </button>
              ))}
            </div>
            <div className="breed-filter-actions">
              <button type="button" className="text-button breed-filter-clear" onClick={() => { setValue(""); setCustom(false); setInvalid(false); }} disabled={!value && !custom}>Limpar</button>
              <button type="button" className="primary-button" onClick={() => setOpen(false)}>Pronto</button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <select className="sr-only" aria-hidden="true" tabIndex={-1} name="breed" value={value} required disabled={custom}
        onChange={(event) => { setValue(event.target.value); setInvalid(false); }}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          if (event.currentTarget.form?.querySelector("input:invalid, select:invalid, textarea:invalid") === event.currentTarget) trigger.current?.focus();
        }}>
        <option value="" disabled>Selecione a raça</option>
        {DOG_BREEDS.map((breed) => <option key={breed}>{breed}</option>)}
        {value && !DOG_BREEDS.some((breed) => breed === value) && <option value={value}>{value}</option>}
      </select>
      {invalid && <span id={`${id}-error`} className="select-error" role="alert">Selecione a raça do seu cachorro.</span>}
      {custom && <>
        <label className="breed-other-label" htmlFor={`${id}-custom`}>Qual é a raça?</label>
        <input ref={customInput} id={`${id}-custom`} name="breed" required minLength={2} maxLength={60}
          value={value} placeholder="Informe a raça do seu cachorro"
          onChange={(event) => setValue(event.target.value)} />
      </>}
    </div>
  );
}
