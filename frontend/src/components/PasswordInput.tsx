import {
  useId,
  useState,
  type InputHTMLAttributes,
  type PointerEvent,
} from "react";

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function PasswordInput({
  label,
  error,
  id,
  className = "",
  ...props
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isVisible, setIsVisible] = useState(false);

  const showWhilePressed = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsVisible(true);
  };

  return (
    <div className="block text-sm font-medium text-ink">
      <label htmlFor={inputId}>{label}</label>
      <div className="relative mt-2">
        <input
          id={inputId}
          type={isVisible ? "text" : "password"}
          className={`block w-full rounded-xl border bg-white px-4 py-3 pr-12 outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/10 ${
            error ? "border-red-300" : "border-black/10"
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          title="Hold to show password"
          onPointerDown={showWhilePressed}
          onPointerUp={() => setIsVisible(false)}
          onPointerCancel={() => setIsVisible(false)}
          onLostPointerCapture={() => setIsVisible(false)}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              setIsVisible(true);
            }
          }}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") {
              setIsVisible(false);
            }
          }}
          onBlur={() => setIsVisible(false)}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-xl text-muted hover:text-sage focus-visible:outline-2 focus-visible:outline-sage"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            {isVisible ? (
              <>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </>
            ) : (
              <>
                <path d="M3 3l18 18" />
                <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15.7 15.7 0 0 1-3.2 4.1" />
                <path d="M6.2 6.3C3.5 8.1 2 12 2 12s3.6 7 10 7c1.2 0 2.3-.3 3.3-.7" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </>
            )}
          </svg>
        </button>
      </div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  );
}
