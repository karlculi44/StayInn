import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";

type MobileNavItem = {
  label: string;
  to: string;
  end?: boolean;
};

export default function MobileNavMenu({
  items,
  ariaLabel,
}: {
  items: MobileNavItem[];
  ariaLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-primary-navigation"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-sage/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage md:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="size-5"
        >
          {isOpen ? (
            <path d="m6 6 12 12M18 6 6 18" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      <nav
        id="mobile-primary-navigation"
        aria-label={ariaLabel}
        hidden={!isOpen}
        className="absolute inset-x-0 top-full z-30 max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-black/5 bg-white px-5 py-3 shadow-md md:hidden"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
            menuButtonRef.current?.focus();
          }
        }}
      >
        <div className="grid gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              end={item.end}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-sage text-white" : "text-muted hover:bg-cream hover:text-ink"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
