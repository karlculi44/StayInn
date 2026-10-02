import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function Input({ label, error, id, ...props }: InputProps) {
  return (
    <label className="block text-sm font-medium text-ink" htmlFor={id}>
      {label}
      <input
        id={id}
        className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/10 ${
          error ? "border-red-300" : "border-black/10"
        }`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
