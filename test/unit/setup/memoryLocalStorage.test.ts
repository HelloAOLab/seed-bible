import { describe, expect, it } from "vitest";

describe("test setup on the browser test environment", () => {
  it("provides a working localStorage", () => {
    localStorage.setItem("sb-setup-check", "1");
    expect(window.localStorage.getItem("sb-setup-check")).toBe("1");
    localStorage.removeItem("sb-setup-check");
    expect(localStorage.getItem("sb-setup-check")).toBeNull();
  });
});
