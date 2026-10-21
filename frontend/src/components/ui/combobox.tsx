import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type ComboboxProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  "aria-label": string;
};

export function Combobox({
  id,
  value,
  onValueChange,
  searchValue,
  onSearchValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-autocomplete="list"
          disabled={disabled}
          className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-left text-sm text-ink shadow-sm outline-none transition hover:border-sage/40 focus-visible:border-sage focus-visible:ring-2 focus-visible:ring-sage/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={selectedOption ? "" : "text-muted"}>
            {selectedOption?.label ?? placeholder}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 shrink-0 opacity-60"
          >
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={5}
          className="animate-ui-enter z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-black/10 bg-white p-0 text-ink shadow-lg outline-none data-[state=closed]:animate-ui-exit"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={searchValue}
              onValueChange={onSearchValueChange}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
            <CommandList>
              {options.length === 0 && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.description ?? ""}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {option.description}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
