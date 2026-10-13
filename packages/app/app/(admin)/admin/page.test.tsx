import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(() => Promise.resolve()),
  check: vi.fn(),
  countUsers: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/server/container", () => ({
  getRequestContainer: () => ({
    resolve: (name: string) => (name === "healthService" ? { check: mocks.check } : { countUsers: mocks.countUsers }),
  }),
}));

const { default: AdminDashboardPage, metadata } = await import("./page");

type AnyElement = ReactElement<{ children?: ReactNode; fallback?: ReactNode }>;

/** Finds the page's `<Suspense>` boundary: the async Server Component and its fallback. */
function findSuspense(node: ReactNode): AnyElement {
  const queue: ReactNode[] = [node];
  while (queue.length > 0) {
    const current = queue.shift();
    if (isValidElement<AnyElement["props"]>(current)) {
      if ("fallback" in current.props) {
        return current;
      }
      queue.push(...[current.props.children].flat());
    }
  }
  throw new Error("No Suspense boundary found");
}

async function renderSystemStatus() {
  const suspense = findSuspense(AdminDashboardPage());
  const status = suspense.props.children as ReactElement;
  const SystemStatus = status.type as () => Promise<ReactElement>;
  render(await SystemStatus());
}

const checkedAt = new Date("2026-10-13T10:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminDashboardPage", () => {
  it("renders the header and a loading fallback", () => {
    const page = AdminDashboardPage();
    render(page.props.children[0]);
    const { container } = render(<>{findSuspense(page).props.fallback}</>);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("DevMentor Admin");
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
    expect(metadata).toEqual({ title: "Dashboard" });
  });

  it("shows healthy checks and the user count", async () => {
    mocks.check.mockResolvedValue({ status: "up", checkedAt, checks: [{ name: "database", status: "up", latencyMs: 3 }] });
    mocks.countUsers.mockResolvedValue(42);

    await renderSystemStatus();

    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(screen.getByText(`Checked at ${checkedAt.toISOString()}`)).toBeInTheDocument();
    expect(screen.getByText("database")).toBeInTheDocument();
    expect(screen.getByText("3 ms")).toBeInTheDocument();
    expect(screen.getByText("up")).toHaveAttribute("data-variant", "default");
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage users" })).toHaveAttribute("href", "/admin/users");
  });

  it("shows failing checks with their error and skips the user count", async () => {
    mocks.check.mockResolvedValue({
      status: "down",
      checkedAt,
      checks: [{ name: "database", status: "down", latencyMs: 9, error: "ECONNREFUSED" }],
    });

    await renderSystemStatus();

    expect(screen.getByText("ECONNREFUSED")).toBeInTheDocument();
    expect(screen.getByText("down")).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(mocks.countUsers).not.toHaveBeenCalled();
  });
});
