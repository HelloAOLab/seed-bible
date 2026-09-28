import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isWebKit,
  isWebKitUserAgent,
} from "@packages/seed-bible/seed-bible/app/ssrEnv";

const SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const CHROME_DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const CHROME_ON_IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1";

describe("isWebKitUserAgent", () => {
  it("flags Safari", () => {
    expect(isWebKitUserAgent(SAFARI_UA)).toBe(true);
  });

  it("does not flag desktop Chrome", () => {
    expect(isWebKitUserAgent(CHROME_DESKTOP_UA)).toBe(false);
  });

  it("flags Chrome on iOS, since iOS forces every browser onto WebKit", () => {
    expect(isWebKitUserAgent(CHROME_ON_IOS_UA)).toBe(true);
  });
});

describe("isWebKit", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to the SSR-derived value when there is no document at all", () => {
    vi.stubGlobal("document", undefined);
    vi.stubGlobal("navigator", undefined);
    expect(isWebKit(true)).toBe(true);
    expect(isWebKit(false)).toBe(false);
  });

  // Regression: this app's server runs on Bun, and Bun ships its own global
  // `navigator` (`{ userAgent: "Bun/x.y.z" }`) on every request — so a guard
  // that keys off `navigator` being defined can never detect "we're on the
  // server" there, and would silently ignore the per-request SSR value in
  // favor of matching Bun's own fake user agent against the WebKit regexes
  // (which never matches). `document` has no such impostor.
  it("falls back to the SSR-derived value under Bun's fake global navigator, even though navigator is defined", () => {
    vi.stubGlobal("document", undefined);
    vi.stubGlobal("navigator", { userAgent: "Bun/1.3.11" });
    expect(isWebKit(true)).toBe(true);
    expect(isWebKit(false)).toBe(false);
  });

  it("prefers the live navigator's user agent over the SSR-derived value", () => {
    vi.stubGlobal("navigator", { userAgent: SAFARI_UA });
    // The SSR guess was wrong (false); the live check corrects it.
    expect(isWebKit(false)).toBe(true);

    vi.stubGlobal("navigator", { userAgent: CHROME_DESKTOP_UA });
    expect(isWebKit(true)).toBe(false);
  });
});
