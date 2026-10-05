import type { ReactNode } from "react";

export default function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-4xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}
