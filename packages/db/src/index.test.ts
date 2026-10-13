import { describe, expect, it } from "vitest";
import * as db from "./index";

describe("@devmentor/db entry point", () => {
  it("exposes the public API", () => {
    expect(Object.keys(db).sort()).toEqual([
      "DatabaseHealthIndicator",
      "MikroOrmUserRepository",
      "UserEntity",
      "createOrmConfig",
      "entities",
      "getOrm",
    ]);
  });
});
