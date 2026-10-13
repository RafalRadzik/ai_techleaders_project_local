import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// `server-only` throws outside the react-server condition; unit tests import server modules directly.
vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
});
