import { useState, type HTMLAttributes } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { adminRaisedLight } from "./adminButtonStyles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

const getColumnClassName = (meta: unknown) =>
  typeof meta === "object" &&
  meta !== null &&
  "className" in meta &&
  typeof meta.className === "string"
    ? meta.className
    : undefined;

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  emptyMessage?: string;
  initialSorting?: SortingState;
  enableSorting?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  showPagination?: boolean;
  showPageSize?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  getRowProps?: (row: TData) => HTMLAttributes<HTMLTableRowElement>;
  tableClassName?: string;
};

export default function DataTable<TData>({
  columns,
  data,
  emptyMessage = "No records found.",
  initialSorting = [],
  enableSorting = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  showPagination = true,
  showPageSize = true,
  pagination,
  onPaginationChange,
  getRowProps,
  tableClassName,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [internalPagination, setInternalPagination] = useState<PaginationState>(
    { pageIndex: 0, pageSize },
  );
  // TanStack's table instance is intentionally scoped to this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: pagination ?? internalPagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSorting,
    autoResetPageIndex: true,
  });
  const currentPagination = table.getState().pagination;
  const pageCount = Math.max(table.getPageCount(), 1);
  const visibleColumns = table.getVisibleLeafColumns().length;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      {showPagination && (showPageSize || pageCount > 1) && (
        <div className="flex flex-col gap-3 border-b border-black/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {showPageSize && (
            <label className="flex items-center gap-2 text-muted">
              Rows per page
              <Select
                value={String(currentPagination.pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger
                  aria-label="Rows per page"
                  className="h-9 w-20 rounded-lg px-2.5 py-1.5"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span className="whitespace-nowrap text-muted" aria-live="polite">
              Page {Math.min(currentPagination.pageIndex + 1, pageCount)} of{" "}
              {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      <Table className={tableClassName}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-cream/35 hover:bg-cream/35">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={getColumnClassName(header.column.columnDef.meta)}
                  aria-sort={
                    header.column.getIsSorted() === "asc"
                      ? "ascending"
                      : header.column.getIsSorted() === "desc"
                        ? "descending"
                        : "none"
                  }
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-2 text-left focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage"
                      aria-label={`Sort by ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.column.id}`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <span aria-hidden="true" className="text-muted">
                        {header.column.getIsSorted() === "asc"
                          ? "↑"
                          : header.column.getIsSorted() === "desc"
                            ? "↓"
                            : "↕"}
                      </span>
                    </button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => {
              const rowProps = getRowProps?.(row.original);
              return (
                <TableRow
                  key={row.id}
                  {...rowProps}
                  className={`${rowProps?.className ?? ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={getColumnClassName(cell.column.columnDef.meta)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={visibleColumns}
                className="h-24 text-center text-muted"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {showPagination && (
        <div className="flex flex-col gap-3 border-t border-black/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {showPageSize && (
            <label className="flex items-center gap-2 text-muted">
              Rows per page
              <Select
                value={String(currentPagination.pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger
                  aria-label="Rows per page"
                  className="h-9 w-20 rounded-lg px-2.5 py-1.5"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span className="whitespace-nowrap text-muted">
              Page {Math.min(currentPagination.pageIndex + 1, pageCount)} of{" "}
              {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
