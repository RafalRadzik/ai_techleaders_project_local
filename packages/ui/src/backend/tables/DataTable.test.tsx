import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "./DataTable";

interface Row {
  id: string;
  name: string;
}

const columns: readonly DataTableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (row) => row.name, className: "font-medium" },
  { id: "id", header: "Id", cell: (row) => row.id },
];

const rowsOf = (count: number): Row[] => Array.from({ length: count }, (_, index) => ({ id: `r${index + 1}`, name: `Row ${index + 1}` }));

const getRowId = (row: Row) => row.id;

function bodyRows() {
  return screen.getAllByRole("row").slice(1);
}

describe("DataTable", () => {
  it("shows the error with a retry button", async () => {
    const onRetry = vi.fn();
    render(<DataTable columns={columns} rows={rowsOf(1)} getRowId={getRowId} error="Load failed" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Load failed");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows loading before the first load", () => {
    render(<DataTable columns={columns} rows={undefined} getRowId={getRowId} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("shows loading while reloading an empty list", () => {
    render(<DataTable columns={columns} rows={[]} getRowId={getRowId} isLoading />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the default empty state", () => {
    render(<DataTable columns={columns} rows={[]} getRowId={getRowId} />);

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("shows a custom empty state", () => {
    render(<DataTable columns={columns} rows={[]} getRowId={getRowId} emptyTitle="No users yet" emptyDescription="Add one" />);

    expect(screen.getByText("No users yet")).toBeInTheDocument();
    expect(screen.getByText("Add one")).toBeInTheDocument();
  });

  it("renders headers and cells without pagination for a single page", () => {
    const { container } = render(<DataTable columns={columns} rows={rowsOf(2)} getRowId={getRowId} isLoading />);

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Name", "Id"]);
    expect(bodyRows().map((row) => row.textContent)).toEqual(["Row 1r1", "Row 2r2"]);
    expect(screen.getByRole("cell", { name: "Row 1" })).toHaveClass("font-medium");
    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("renders row actions", () => {
    render(
      <DataTable
        columns={columns}
        rows={rowsOf(1)}
        getRowId={getRowId}
        rowActions={(row) => <button type="button">Edit {row.name}</button>}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Row 1" })).toBeInTheDocument();
  });

  it("paginates and clamps the page when rows shrink", async () => {
    const { rerender } = render(<DataTable columns={columns} rows={rowsOf(5)} getRowId={getRowId} pageSize={2} />);
    const previous = () => screen.getByRole("button", { name: "Previous" });
    const next = () => screen.getByRole("button", { name: "Next" });

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(previous()).toBeDisabled();

    await userEvent.click(next());
    await userEvent.click(next());
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(next()).toBeDisabled();
    expect(within(bodyRows()[0] as HTMLElement).getByText("Row 5")).toBeInTheDocument();

    await userEvent.click(previous());
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    await userEvent.click(next());

    rerender(<DataTable columns={columns} rows={rowsOf(3)} getRowId={getRowId} pageSize={2} />);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(bodyRows().map((row) => row.textContent)).toEqual(["Row 3r3"]);
  });

  it("uses a page size of 10 by default", () => {
    render(<DataTable columns={columns} rows={rowsOf(11)} getRowId={getRowId} />);

    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });
});
