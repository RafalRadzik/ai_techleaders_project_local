import type { ApiResult } from "@devmentor/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsersPanel } from "./users-panel";

const { apiCall } = vi.hoisted(() => ({ apiCall: vi.fn() }));

vi.mock("@devmentor/ui/backend/api/apiCall", () => ({ apiCall }));

const ada = { id: "1", email: "ada@example.com", name: "Ada", createdAt: "2026-10-13T10:00:00.000Z" };
const grace = { id: "2", email: "grace@example.com", name: "Grace", createdAt: "2026-10-13T11:00:00.000Z" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function addUser(name: string, email: string) {
  await userEvent.type(screen.getByLabelText("Name"), name);
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.click(screen.getByRole("button", { name: "Add user" }));
}

beforeEach(() => {
  apiCall.mockReset();
});

describe("UsersPanel", () => {
  it("loads and lists users with formatted dates", async () => {
    apiCall.mockResolvedValueOnce({ ok: true, data: [ada] });

    render(<UsersPanel />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "ada@example.com" })).toBeInTheDocument();
    const formatted = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(ada.createdAt),
    );
    expect(screen.getByRole("cell", { name: formatted })).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith("/api/users", { signal: expect.any(AbortSignal) });
  });

  it("shows the empty state", async () => {
    apiCall.mockResolvedValueOnce({ ok: true, data: [] });

    render(<UsersPanel />);

    expect(await screen.findByText("No users yet")).toBeInTheDocument();
  });

  it("shows a load error and retries", async () => {
    apiCall
      .mockResolvedValueOnce({ ok: false, error: { code: "network_error", message: "Could not reach the server." } })
      .mockResolvedValueOnce({ ok: true, data: [ada] });

    render(<UsersPanel />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("cell", { name: "Ada" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it("ignores a response that arrives after unmounting", async () => {
    const pending = deferred<ApiResult<unknown>>();
    apiCall.mockReturnValueOnce(pending.promise);

    const { unmount } = render(<UsersPanel />);
    const signal = (apiCall.mock.calls[0]?.[1] as { signal: AbortSignal }).signal;
    unmount();
    pending.resolve({ ok: true, data: [ada] });

    await waitFor(() => expect(signal.aborted).toBe(true));
  });

  it("adds a created user to the top of the list", async () => {
    apiCall.mockResolvedValueOnce({ ok: true, data: [ada] }).mockResolvedValueOnce({ ok: true, data: grace });

    render(<UsersPanel />);
    await screen.findByRole("cell", { name: "Ada" });
    await addUser("Grace", "Grace@Example.com");

    expect(apiCall).toHaveBeenLastCalledWith("/api/users", {
      method: "POST",
      json: { name: "Grace", email: "grace@example.com" },
    });
    await waitFor(() =>
      expect(screen.getAllByRole("row").slice(1).map((row) => row.firstChild?.textContent)).toEqual(["Grace", "Ada"]),
    );
  });

  it("shows a created user even before the first load finished", async () => {
    apiCall.mockReturnValueOnce(new Promise(() => undefined)).mockResolvedValueOnce({ ok: true, data: grace });

    render(<UsersPanel />);
    await addUser("Grace", "grace@example.com");

    expect(await screen.findByRole("cell", { name: "Grace" })).toBeInTheDocument();
  });
});
