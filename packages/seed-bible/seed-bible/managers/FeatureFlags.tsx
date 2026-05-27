import { signal, type ReadonlySignal } from "@preact/signals";

const cache = new Map<string, ReadonlySignal<boolean>>();

/**
 * Gets a signal for a feature flag. The signal will be updated whenever the feature flag value changes.
 * @param flagName The name of the feature flag to get.
 * @param defaultValue The default value to use for the feature flag if it is not available from PostHog.
 */
export function getFeatureFlagSignal(flagName: string, defaultValue: boolean) {
  if (cache.has(flagName)) {
    return cache.get(flagName)!;
  }

  const flag = signal<boolean>(defaultValue);
  cache.set(flagName, flag);

  if (posthog) {
    posthog.onFeatureFlags(() => {
      flag.value = posthog?.isFeatureEnabled(flagName);
    });
  } else {
    // If PostHog is not available, then all features are enabled by default
    flag.value = true;
  }

  return flag;
}
