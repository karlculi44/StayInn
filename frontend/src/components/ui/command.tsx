import { Command as CommandPrimitive } from "cmdk";
import type { ComponentProps } from "react";

export function Command({
  className = "",
  ...props
}: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={`flex max-h-80 w-full flex-col overflow-hidden rounded-xl bg-white text-ink ${className}`}
      {...props}
    />
  );
}

export function CommandInput({
  className = "",
  ...props
}: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <CommandPrimitive.Input
      className={`h-10 w-full border-0 border-b border-black/10 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-muted focus:ring-0 ${className}`}
      {...props}
    />
  );
}

export function CommandList({
  className = "",
  ...props
}: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={`max-h-64 overflow-y-auto p-1 ${className}`}
      {...props}
    />
  );
}

export function CommandEmpty({
  className = "",
  ...props
}: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className={`px-3 py-6 text-center text-sm text-muted ${className}`}
      {...props}
    />
  );
}

export function CommandGroup({
  className = "",
  ...props
}: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={`overflow-hidden text-ink ${className}`}
      {...props}
    />
  );
}

export function CommandItem({
  className = "",
  ...props
}: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={`flex cursor-default select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none data-[selected=true]:bg-cream data-[selected=true]:text-ink ${className}`}
      {...props}
    />
  );
}
