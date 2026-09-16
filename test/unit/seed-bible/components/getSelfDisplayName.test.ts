import { signal } from "@preact/signals";
import { getSelfDisplayName } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { I18nHook } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

/**
 * Stands in for i18next: returns the translation when the active language has
 * one, and otherwise falls back to the `defaultValue` the caller supplied —
 * which is how the real `t` behaves for a key a locale hasn't translated yet.
 */
function createT(translations: Record<string, string> = {}): I18nHook["t"] {
  return ((key: string, options?: { defaultValue?: string }) =>
    translations[key] ?? options?.defaultValue ?? key) as I18nHook["t"];
}

/**
 * The two signals `getSelfDisplayName` reads. A signed-out reader has neither a
 * userId nor a profile; a signed-in one whose profile hasn't loaded yet has a
 * userId but no profile.
 */
function createState(options: {
  userId?: string | null;
  profileName?: string | null;
}): SeedBibleState {
  return {
    login: {
      userId: signal(options.userId ?? null),
      profile: signal(
        options.profileName == null ? null : { name: options.profileName }
      ),
    },
  } as unknown as SeedBibleState;
}

describe("getSelfDisplayName", () => {
  it("uses the profile name when there is one", () => {
    const state = createState({ userId: "user-1", profileName: "Alice" });

    expect(getSelfDisplayName(state, createT())).toBe("Alice");
  });

  it("falls back to a short userId when signed in without a loaded profile", () => {
    const state = createState({ userId: "abcdefghijklmnop" });

    expect(getSelfDisplayName(state, createT())).toBe("abcdefgh");
  });

  it("leaves a userId shorter than the slice untouched", () => {
    const state = createState({ userId: "abc" });

    expect(getSelfDisplayName(state, createT())).toBe("abc");
  });

  it("falls back to the anonymous translation when signed out", () => {
    const state = createState({});

    expect(getSelfDisplayName(state, createT({ anonymous: "Anónimo" }))).toBe(
      "Anónimo"
    );
  });

  it("falls back to English when the locale has no anonymous translation", () => {
    const state = createState({});

    expect(getSelfDisplayName(state, createT())).toBe("Anonymous");
  });

  // A profile can carry an empty name, and an empty tooltip tells the reader
  // nothing. `??` used to let it through.
  it("treats an empty profile name as no name, falling back to the userId", () => {
    const state = createState({
      userId: "abcdefghijklmnop",
      profileName: "",
    });

    expect(getSelfDisplayName(state, createT())).toBe("abcdefgh");
  });

  it("falls back to anonymous when the profile name is empty and there is no userId", () => {
    const state = createState({ userId: null, profileName: "" });

    expect(getSelfDisplayName(state, createT({ anonymous: "Anónimo" }))).toBe(
      "Anónimo"
    );
  });

  it("treats a whitespace-only profile name as no name", () => {
    const state = createState({
      userId: "abcdefghijklmnop",
      profileName: "   ",
    });

    expect(getSelfDisplayName(state, createT())).toBe("abcdefgh");
  });

  it("trims a padded profile name rather than showing the padding", () => {
    const state = createState({ userId: "user-1", profileName: "  Alice  " });

    expect(getSelfDisplayName(state, createT())).toBe("Alice");
  });

  it("prefers the profile name over the userId", () => {
    const state = createState({
      userId: "abcdefghijklmnop",
      profileName: "Alice",
    });

    expect(getSelfDisplayName(state, createT())).toBe("Alice");
  });
});
