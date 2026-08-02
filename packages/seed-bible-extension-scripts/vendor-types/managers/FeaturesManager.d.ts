import { type ReadonlySignal } from "@preact/signals";
export interface PostHog {
  isFeatureEnabled: (featureKey: string) => boolean;
  onFeatureFlags: (callback: (flags: string[]) => void) => void;
}
export declare const FEATURE_KEY_READING_PLANS = "reading-plans";
export declare function createFeaturesManager(posthog: PostHog | null): {
  isFeatureEnabled: (featureKey: string) => ReadonlySignal<boolean>;
};
export type FeaturesManager = ReturnType<typeof createFeaturesManager>;
