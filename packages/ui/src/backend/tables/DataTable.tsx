"use client";

import { EmptyState } from "@devmentor/ui/backend/feedback/EmptyState";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/ErrorMessage";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/LoadingMessage";
import { Button } from "@devmentor/ui/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@devmentor/ui/components/ui/table";
import { useState, type ReactNode } from "react";

const DEFAULT_PAGE_SIZE = 10;

export interface DataTableColumn<TRow> {
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  className?: string;
}

interface DataTableProps<TRow> {
  columns: readonly DataTableColumn<TRow>[];
  /** `undefined` while the first load is in flight. */
  rows: readonly TRow[] | undefined;
  getRowId: (row: TRow) => string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  rowActions?: (row: TRow) => ReactNode;
}

/** Column-config-driven list with loading, error and empty states and client-side pagination. */
export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  pageSize = DEFAULT_PAGE_SIZE,
  rowActions,
}: DataTableProps<TRow>) {
  const [page, setPage] = useState(0);

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }
  if (rows === undefined || (isLoading && rows.length === 0)) {
    return <LoadingMessage />;
  }
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const pageCount = Math.ceil(rows.length / pageSize);
  // Clamp instead of syncing state: the row count can shrink after a reload.
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3" aria-busy={isLoading}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {rowActions ? <TableHead className="text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((column) => (
                <TableCell key={column.id} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
              {rowActions ? <TableCell className="text-right">{rowActions(row)}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageCount > 1 ? (
        <div className="text-muted-foreground flex items-center justify-end gap-2 text-sm">
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
