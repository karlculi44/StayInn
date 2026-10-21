import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export function DropdownMenuContent({
  className = "",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={`animate-ui-enter z-50 min-w-48 overflow-hidden rounded-xl border border-black/10 bg-white p-1.5 text-ink shadow-lg outline-none data-[state=closed]:animate-ui-exit ${className}`}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className = "",
  variant = "default",
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-variant={variant}
      className={`flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors data-highlighted:bg-cream data-disabled:pointer-events-none data-disabled:opacity-50 ${variant === "destructive" ? "text-red-700 data-highlighted:bg-red-50" : "text-ink"} ${className}`}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className = "",
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={`-mx-1 my-1 h-px bg-black/10 ${className}`}
      {...props}
    />
  );
}
