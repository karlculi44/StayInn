type PrimaryNavIconName = "home" | "rooms" | "about" | "dashboard";

export default function PrimaryNavIcon({ name }: { name: PrimaryNavIconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-2 inline size-4 shrink-0 align-[-3px]"
    >
      {name === "home" && (
        <>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v12h14V9M9 21v-7h6v7" />
        </>
      )}
      {name === "rooms" && (
        <>
          <path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
          <path d="M3 16h18M5 11V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v4" />
          <path d="M12 11V9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3 18v2m18-2v2" />
        </>
      )}
      {name === "about" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5m0-8h.01" />
        </>
      )}
      {name === "dashboard" && (
        <>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </>
      )}
    </svg>
  );
}
