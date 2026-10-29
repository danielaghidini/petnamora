"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, PawPrint, Plus } from "lucide-react";
import type { DogProfile } from "./types";

function DogPhoto({ dog }: { dog: DogProfile }) {
  return (
    <span className="dog-picker-photo">
      {dog.photoUrl ? <img src={dog.photoUrl} alt="" width={56} height={56} /> : <PawPrint size={24} aria-hidden="true" />}
    </span>
  );
}

export function ActiveDogPicker({ dogs, activeDog, disabled, onSelect, onAdd }: {
  dogs: DogProfile[];
  activeDog?: DogProfile;
  disabled: boolean;
  onSelect: (dogId: string) => void;
  onAdd: () => void;
}) {
  if (!activeDog) return (
    <div className="dog-picker-card">
      <span className="dog-picker-label">Meu cachorro</span>
      <p>Apresente seu cachorro para encontrar um namorinho.</p>
      <button type="button" className="secondary-button" onClick={onAdd}>
        <Plus size={16} aria-hidden="true" /> Cadastrar meu cachorro
      </button>
    </div>
  );

  const profile = <>
    <DogPhoto dog={activeDog} />
    <span className="dog-picker-profile">
      <strong>{activeDog.name}</strong>
      <span>{activeDog.breed}</span>
    </span>
  </>;

  return (
    <div className="dog-picker-card">
      <span className="dog-picker-label">Meu cachorro</span>
      {dogs.length > 1 ? (
        <Select.Root value={activeDog.id} onValueChange={onSelect} disabled={disabled}>
          <Select.Trigger className="dog-picker-trigger" aria-label={`Trocar cachorro. Selecionado: ${activeDog.name}`}>
            <Select.Value>{profile}</Select.Value>
            <Select.Icon className="dog-picker-chevron"><ChevronDown size={18} aria-hidden="true" /></Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="select-content dog-picker-options" position="popper" sideOffset={8} collisionPadding={12}>
              <Select.ScrollUpButton className="select-scroll-button"><ChevronUp size={16} aria-hidden="true" /></Select.ScrollUpButton>
              <Select.Viewport className="select-viewport">
                {dogs.map((dog) => (
                  <Select.Item key={dog.id} value={dog.id} textValue={dog.name} className="select-option dog-picker-option">
                    <DogPhoto dog={dog} />
                    <span className="dog-picker-profile">
                      <Select.ItemText>{dog.name}</Select.ItemText>
                      <span>{dog.breed}</span>
                    </span>
                    <Select.ItemIndicator className="select-indicator"><Check size={17} aria-hidden="true" /></Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
              <Select.ScrollDownButton className="select-scroll-button"><ChevronDown size={16} aria-hidden="true" /></Select.ScrollDownButton>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      ) : <div className="dog-picker-current">{profile}</div>}
      {dogs.length === 1 && <p>Prontinho para encontrar um crush.</p>}
    </div>
  );
}
