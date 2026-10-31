import { signal } from "@preact/signals";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";

/**
 * Minimal LoginManager stand-in for tests that build a real `SettingsManager`.
 * `updateProfile` optimistically updates the `profile` signal the same way the
 * real manager does, which is what SettingsManager's profile-language effect
 * and profile/localConfig fallback reads subscribe to.
 */
export function makeFakeLogin(
  initialProfile: UserProfile | null
): LoginManager {
  const userId = signal<string | null>(initialProfile ? "user-1" : null);
  const profile = signal<UserProfile | null>(initialProfile);
  const localConfig = signal<Record<string, unknown>>({});
  return {
    userId,
    profile,
    localConfig,
    profilePromise: Promise.resolve(initialProfile),
    updateProfile: (newData: Partial<UserProfile>) => {
      if (!profile.value) return;
      profile.value = { ...profile.value, ...newData };
    },
  } as unknown as LoginManager;
}
