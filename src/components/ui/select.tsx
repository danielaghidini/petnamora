"use client";

import { useId, useRef, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectProps = {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

const emptyOptionValue = "__select_empty__";

export function Select({
  label, options, value, defaultValue = "", onValueChange, name,
  placeholder = "Selecione", required, disabled,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [invalid, setInvalid] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  const selectedValue = value ?? uncontrolledValue;
  const hasEmptyOption = options.some((option) => option.value === "");
  const internalValue = selectedValue === "" && hasEmptyOption ? emptyOptionValue : selectedValue;
  const selectedOption = options.find((option) => option.value === selectedValue);

  function change(nextValue: string) {
    setUncontrolledValue(nextValue);
    setInvalid(false);
    onValueChange?.(nextValue);
  }

  return (
    <span className="select-field">
      <SelectPrimitive.Root
        value={internalValue}
        onValueChange={(next) => {
          change(next === emptyOptionValue ? "" : next);
        }}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger ref={trigger} className="select-trigger" aria-label={label}
          aria-required={required || undefined} aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}>
          <SelectPrimitive.Value placeholder={placeholder}>
            <span>{selectedOption?.label}</span>
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon className="select-icon">
            <ChevronDown size={17} aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="select-content"
            aria-label={label}
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            <SelectPrimitive.ScrollUpButton className="select-scroll-button">
              <ChevronUp size={16} aria-hidden="true" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="select-viewport">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value === "" ? emptyOptionValue : option.value}
                  disabled={option.disabled}
                  className="select-option"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="select-indicator">
                    <Check size={17} aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="select-scroll-button">
              <ChevronDown size={16} aria-hidden="true" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {/* Native form submission and validation use the actual values, including "". */}
      {name && (
        <select className="sr-only" aria-hidden="true" tabIndex={-1}
          name={name} value={selectedValue} required={required} disabled={disabled}
          onChange={(event) => change(event.target.value)}
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
            const firstInvalid = event.currentTarget.form?.querySelector("input:invalid, select:invalid, textarea:invalid");
            if (firstInvalid === event.currentTarget) trigger.current?.focus();
          }}>
          {!hasEmptyOption && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
        </select>
      )}
      {invalid && <span className="select-error" id={errorId} role="alert">Selecione uma opção.</span>}
    </span>
  );
}
