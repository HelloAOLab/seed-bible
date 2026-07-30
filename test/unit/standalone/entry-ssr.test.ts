import { acceptLanguageRedirect, render } from "../../../standalone/entry-ssr";
import { DEFAULT_APP_CONFIG } from "@packages/seed-bible/seed-bible/app/appConfig";

describe("acceptLanguageRedirect", () => {
  it("redirects the 3-segment form to the visitor's preferred supported language", () => {
    expect(acceptLanguageRedirect("/AAB/john/3", "", ["fr-FR", "en-US"])).toBe(
      "/fr/AAB/john/3"
    );
  });

  it("picks the first supported language in the Accept-Language list, ignoring unsupported ones ahead of it", () => {
    expect(
      acceptLanguageRedirect("/AAB/john/3", "", ["xx-XX", "de-DE", "fr-FR"])
    ).toBe("/de/AAB/john/3");
  });

  it("preserves other query params on the redirect target", () => {
    expect(acceptLanguageRedirect("/AAB/john/3?verse=5", "", ["fr-FR"])).toBe(
      "/fr/AAB/john/3?verse=5"
    );
  });

  it("prefixes the redirect target with the deployment basePath", () => {
    expect(
      acceptLanguageRedirect("/d/branch-x/AAB/john/3", "/d/branch-x", ["fr-FR"])
    ).toBe("/d/branch-x/fr/AAB/john/3");
  });

  it("does not redirect when the visitor already prefers the default language", () => {
    expect(acceptLanguageRedirect("/AAB/john/3", "", ["en-US"])).toBeNull();
  });

  it("does not redirect when no Accept-Language header was sent", () => {
    expect(acceptLanguageRedirect("/AAB/john/3", "", [])).toBeNull();
  });

  it("does not redirect when none of the visitor's preferences are supported", () => {
    expect(acceptLanguageRedirect("/AAB/john/3", "", ["xx-XX"])).toBeNull();
  });

  it("does not redirect an already-explicit 4-segment URL, even for a different Accept-Language", () => {
    expect(acceptLanguageRedirect("/en/AAB/john/3", "", ["de-DE"])).toBeNull();
  });

  it("does not redirect a fuzzy-matched book (that's legacyReadingUrlRedirect's job)", () => {
    // "senesis" only resolves via the fuzzy fallback, not an exact match (see
    // ReadingUrlPath.test.ts) — this function only ever acts on an exact match.
    expect(acceptLanguageRedirect("/AAB/senesis/3", "", ["fr-FR"])).toBeNull();
  });

  it("does not redirect an unresolved book", () => {
    expect(acceptLanguageRedirect("/AAB/notabook/3", "", ["fr-FR"])).toBeNull();
  });

  it("does not redirect a non-reading-path URL (falls through to legacy handling)", () => {
    expect(acceptLanguageRedirect("/john/3", "", ["fr-FR"])).toBeNull();
    expect(acceptLanguageRedirect("/", "", ["fr-FR"])).toBeNull();
  });
});

describe("render() Accept-Language redirect wiring", () => {
  // Both cases here resolve before any network call (the redirect checks run
  // ahead of `createSeedBibleState`), so no fetch mocking is needed.

  it("returns a 302 with a Vary: Accept-Language header for a language-negotiated redirect", async () => {
    const result = await render({
      path: "/AAB/john/3",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: ["fr-FR"] },
      html: "",
    });

    expect(result).toEqual({
      redirectTo: "/fr/AAB/john/3",
      redirectStatus: 302,
      vary: "Accept-Language",
    });
  });

  it("still returns a plain 301 (no redirectStatus/vary) for the pre-existing fuzzy-match redirect", async () => {
    const result = await render({
      path: "/AAB/senesis/3",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: ["fr-FR"] },
      html: "",
    });

    expect(result).toEqual({ redirectTo: "/AAB/genesis/3" });
  });
});
