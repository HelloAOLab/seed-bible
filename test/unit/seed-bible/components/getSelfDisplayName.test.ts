import { signal } from "@preact/signals";
import { getSelfDisplayName } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { getUserAnimalVisual } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { visualAnonymousLabel } from "@packages/seed-bible/seed-bible/managers/Utils";
import { mockTranslate } from "../testUtils/mockI18n";

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

function anonymousLabel(userId: string): string {
  return visualAnonymousLabel(getUserAnimalVisual(userId), mockTranslate);
}

describe("getSelfDisplayName", () => {
  it("uses the profile name when there is one", () => {
    const state = createState({ userId: "user-1", profileName: "Alice" });

    expect(getSelfDisplayName(state, mockTranslate)).toBe("Alice");
  });

  it("falls back to Color + Icon when signed in without a loaded profile", () => {
    const state = createState({ userId: "abcdefghijklmnop" });

    expect(getSelfDisplayName(state, mockTranslate)).toBe(
      anonymousLabel("abcdefghijklmnop")
    );
  });

  it("falls back to the anonymous translation when signed out", () => {
    const state = createState({});

    expect(
      getSelfDisplayName(state, (key, options) =>
        key === "anonymous" ? "Anónimo" : mockTranslate(key, options)
      )
    ).toBe("Anónimo");
  });

  it("falls back to English when the locale has no anonymous translation", () => {
    const state = createState({});

    expect(getSelfDisplayName(state, mockTranslate)).toBe("Anonymous");
  });

  // A profile can carry an empty name, and an empty tooltip tells the reader
  // nothing. `??` used to let it through.
  it("treats an empty profile name as no name, falling back to Color + Icon", () => {
    const state = createState({
      userId: "abcdefghijklmnop",
      profileName: "",
    });

    expect(getSelfDisplayName(state, mockTranslate)).toBe(
      anonymousLabel("abcdefghijklmnop")
    );
  });

  it("falls back to anonymous when the profile name is empty and there is no userId", () => {
    const state = createState({ userId: null, profileName: "" });

    expect(
      getSelfDisplayName(state, (key, options) =>
        key === "anonymous" ? "Anónimo" : mockTranslate(key, options)
      )
    ).toBe("Anónimo");
  });

  it("treats a whitespace-only profile name as no name", () => {
    const state = createState({
      userId: "abcdefghijklmnop",
      profileName: "   ",
    });

    expect(getSelfDisplayName(state, mockTranslate)).toBe(
      anonymousLabel("abcdefghijklmnop")
    );
  });

  it("trims a padded profile name rather than showing the padding", () => {
    const state = createState({ userId: "user-1", profileName: "  Alice  " });

    expect(getSelfDisplayName(state, mockTranslate)).toBe("Alice");
  });

  it("prefers the profile name over the Color + Icon fallback", () => {
    const state = createState({
      userId: "abcdefghijklmnop",
      profileName: "Alice",
    });

    expect(getSelfDisplayName(state, mockTranslate)).toBe("Alice");
  });
});
