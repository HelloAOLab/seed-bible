// @vitest-environment node
import { describe, expect, it } from "vitest";

describe("test setup on the server-side test environment", () => {
  it("leaves localStorage missing, as it is on the real server", () => {
    expect(typeof window).toBe("undefined");
    expect(globalThis.localStorage?.getItem).toBeUndefined();
  });
});
