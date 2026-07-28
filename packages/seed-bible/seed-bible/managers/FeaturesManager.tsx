import { signal, type ReadonlySignal, type Signal } from "@preact/signals";

export interface PostHog {
  isFeatureEnabled: (featureKey: string) => boolean;
  onFeatureFlags: (callback: (flags: string[]) => void) => void;
}

export const FEATURE_KEY_READING_PLANS = "reading-plans";

export function createFeaturesManager(posthog: PostHog | null) {
  const flags = signal<string[]>([]);
  const signals = new Map<string, Signal<boolean>>();

  const getFeatureSignal = (featureKey: string): Signal<boolean> => {
    if (!signals.has(featureKey)) {
      const s = signal(false);
      signals.set(featureKey, s);
    }
    return signals.get(featureKey)!;
  };

  const isFeatureEnabled = (featureKey: string): ReadonlySignal<boolean> => {
    const s = getFeatureSignal(featureKey);
    if (import.meta.env.DEV) {
      s.value = true;
    } else if (import.meta.env.SSR || !posthog) {
      s.value = false;
    } else {
      s.value = flags.peek().includes(featureKey);
    }

    return s;
  };

  if (posthog) {
    posthog.onFeatureFlags((f) => {
      flags.value = f;
      for (const [featureKey, s] of signals.entries()) {
        const featureEnabled = flags.peek().includes(featureKey);
        s.value = featureEnabled ?? false;
      }
    });
  }

  return {
    isFeatureEnabled,
  };
}

export type FeaturesManager = ReturnType<typeof createFeaturesManager>;
