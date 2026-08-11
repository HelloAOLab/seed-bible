import {
  createFeaturesManager,
  FEATURE_KEY_READING_PLANS,
  type PostHog,
} from "@packages/seed-bible/seed-bible/managers/FeaturesManager";

// Temporarily overrides import.meta.env flags for the duration of `fn`,
// restoring the previous values (or removing the key entirely if it was
// unset) afterward. Mirrors the pattern used in I18nManager.test.ts.
function withEnv<T>(
  env: Partial<{ DEV: boolean; SSR: boolean }>,
  fn: () => T
): T {
  const original: Partial<Record<"DEV" | "SSR", boolean | undefined>> = {};
  for (const key of Object.keys(env) as Array<"DEV" | "SSR">) {
    original[key] = import.meta.env[key] as any;
    (import.meta.env as Record<string, boolean>)[key] = env[key]!;
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(env) as Array<"DEV" | "SSR">) {
      if (original[key] === undefined) {
        delete (import.meta.env as Record<string, boolean | undefined>)[key];
      } else {
        (import.meta.env as Record<string, boolean>)[key] = original[key]!;
      }
    }
  }
}

// A fake PostHog client whose flags can be changed after construction, and
// whose `onFeatureFlags` listener can be triggered on demand to simulate a
// flags-updated push from PostHog.
function makeFakePostHog(initialFlags: Record<string, boolean | undefined>) {
  const flags = { ...initialFlags };
  let listener: ((flags: string[]) => void) | null = null;
  const posthog: PostHog = {
    isFeatureEnabled: (key: string) => flags[key] ?? false,
    onFeatureFlags: (callback: (flags: string[]) => void) => {
      listener = callback;
    },
  };
  return {
    posthog,
    setFlag(key: string, value: boolean | undefined) {
      flags[key] = value;
    },
    pushFlagsUpdate() {
      const f = [];
      for (const [key, value] of Object.entries(flags)) {
        if (value) {
          f.push(key);
        }
      }
      listener?.(f);
    },
  };
}

describe("FeaturesManager", () => {
  it("enables every feature in dev mode, even with no posthog client", () => {
    withEnv({ DEV: true }, () => {
      const manager = createFeaturesManager(null);
      expect(manager.isFeatureEnabled(FEATURE_KEY_READING_PLANS).value).toBe(
        true
      );
      expect(manager.isFeatureEnabled("some-other-flag").value).toBe(true);
    });
  });

  it("enables every feature in dev mode even if posthog says it's off", () => {
    withEnv({ DEV: true }, () => {
      const { posthog } = makeFakePostHog({
        [FEATURE_KEY_READING_PLANS]: false,
      });
      const manager = createFeaturesManager(posthog);
      expect(manager.isFeatureEnabled(FEATURE_KEY_READING_PLANS).value).toBe(
        true
      );
    });
  });

  it("disables every feature during SSR, outside of dev mode", () => {
    withEnv({ DEV: false, SSR: true }, () => {
      const { posthog } = makeFakePostHog({
        [FEATURE_KEY_READING_PLANS]: true,
      });
      const manager = createFeaturesManager(posthog);
      expect(manager.isFeatureEnabled(FEATURE_KEY_READING_PLANS).value).toBe(
        false
      );
    });
  });

  it("disables every feature when there is no posthog client, outside of dev/SSR", () => {
    withEnv({ DEV: false, SSR: false }, () => {
      const manager = createFeaturesManager(null);
      expect(manager.isFeatureEnabled(FEATURE_KEY_READING_PLANS).value).toBe(
        false
      );
    });
  });

  it("reads the flag value from posthog outside of dev mode and SSR", () => {
    withEnv({ DEV: false, SSR: false }, () => {
      const { posthog, pushFlagsUpdate } = makeFakePostHog({
        [FEATURE_KEY_READING_PLANS]: true,
      });
      const manager = createFeaturesManager(posthog);

      pushFlagsUpdate(); // Simulate PostHog pushing the initial flags

      expect(manager.isFeatureEnabled(FEATURE_KEY_READING_PLANS).value).toBe(
        true
      );
    });
  });

  it("falls back to false when posthog returns undefined for a flag", () => {
    withEnv({ DEV: false, SSR: false }, () => {
      const { posthog } = makeFakePostHog({
        [FEATURE_KEY_READING_PLANS]: undefined,
      });
      const manager = createFeaturesManager(posthog);
      expect(manager.isFeatureEnabled(FEATURE_KEY_READING_PLANS).value).toBe(
        false
      );
    });
  });

  it("returns the same signal instance for repeated calls with the same key", () => {
    const manager = createFeaturesManager(null);
    const first = manager.isFeatureEnabled(FEATURE_KEY_READING_PLANS);
    const second = manager.isFeatureEnabled(FEATURE_KEY_READING_PLANS);
    expect(first).toBe(second);
  });

  it("updates every tracked signal when posthog pushes new flag values", () => {
    withEnv({ DEV: false, SSR: false }, () => {
      const { posthog, setFlag, pushFlagsUpdate } = makeFakePostHog({
        "flag-a": false,
        "flag-b": true,
      });
      const manager = createFeaturesManager(posthog);

      const flagA = manager.isFeatureEnabled("flag-a");
      const flagB = manager.isFeatureEnabled("flag-b");

      // Flags aren't evaluated until the first push from PostHog
      expect(flagA.value).toBe(false);
      expect(flagB.value).toBe(false);

      setFlag("flag-a", true);
      setFlag("flag-b", false);
      pushFlagsUpdate();

      expect(flagA.value).toBe(true);
      expect(flagB.value).toBe(false);
    });
  });

  it("does not register a posthog flags listener when there is no posthog client", () => {
    // Constructing the manager with a null client must not throw even though
    // the real implementation would otherwise call `posthog.onFeatureFlags`.
    expect(() => createFeaturesManager(null)).not.toThrow();
  });
});
