export interface PostHog {
  isFeatureEnabled: (featureKey: string) => boolean;
}

export const FEATURE_KEY_READING_PLANS = "reading-plans";

export function createFeaturesManager(posthog: PostHog | null) {
  const isFeatureEnabled = (featureKey: string): boolean => {
    if (import.meta.env.DEV) {
      return true;
    }

    if (import.meta.env.SSR) {
      return false;
    }

    if (!posthog) {
      return true;
    }

    return posthog.isFeatureEnabled(featureKey) ?? false;
  };

  return {
    isFeatureEnabled,
  };
}

export type FeaturesManager = ReturnType<typeof createFeaturesManager>;
