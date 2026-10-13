// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("enables Cache Components and the Tailwind CSS loader", () => {
    expect(nextConfig.cacheComponents).toBe(true);
    expect(nextConfig.partialPrefetching).toBe(true);
    expect(nextConfig.turbopack?.rules?.["*.css"]).toEqual({ loaders: ["@tailwindcss/turbopack"], as: "*.css" });
  });
});
