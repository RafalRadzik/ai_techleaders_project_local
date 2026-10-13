import { vi } from "vitest";
import type { AppContainer } from "@/server/container";

/** A request scope whose `resolve` returns the given services (and a mock logger). */
export function fakeContainer(services: Record<string, unknown> = {}) {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const registry: Record<string, unknown> = { logger, ...services };
  const container = {
    resolve: vi.fn((name: string) => {
      if (!(name in registry)) {
        throw new Error(`Unexpected resolve: ${name}`);
      }
      return registry[name];
    }),
  } as unknown as AppContainer;
  return { container, logger };
}

export function jsonRequest(method: string, body?: unknown, { clientHeader = true } = {}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (clientHeader) {
    headers.set("x-devmentor-client", "1");
  }
  return new Request("http://localhost/api/things", {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}
