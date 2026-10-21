import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

const tableCellStyles =
  "px-4 py-3.5 align-middle sm:px-6 [&:has([role=checkbox])]:pr-0";

export function Table({
  className = "",
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={`w-full caption-bottom text-left text-sm ${className}`}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`[&_tr]:border-b [&_tr]:border-black/10 ${className}`}
      {...props}
    />
  );
}

export function TableBody({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={`[&_tr:last-child]:border-0 ${className}`}
      {...props}
    />
  );
}

export function TableFooter({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={`border-t border-black/10 bg-cream/40 font-medium ${className}`}
      {...props}
    />
  );
}

export function TableRow({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`border-b border-black/10 transition-colors hover:bg-cream/50 data-[state=selected]:bg-cream ${className}`}
      {...props}
    />
  );
}

export function TableHead({
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`${tableCellStyles} h-12 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  );
}

export function TableCell({
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`${tableCellStyles} ${className}`} {...props} />;
}

export function TableCaption({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <caption
      className={`mt-4 text-sm text-muted ${className}`}
      {...props}
    />
  );
}
