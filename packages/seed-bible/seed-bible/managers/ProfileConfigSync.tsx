import type { LoginManager, UserProfile } from "../managers/LoginManager";

/**
 * Reads a value from the user's profile config.
 *
 * Returns `null` when the user is not logged in, the profile hasn't loaded
 * yet, or the key is not set on the profile. Caller is expected to fall
 * back to a local cache (e.g. `configBot.tags`) and parse the result.
 */
export function getProfileConfigValue(
  profile: UserProfile | null,
  key: string
): unknown {
  const profileConfig = profile?.config;
  if (!profileConfig || typeof profileConfig !== "object") {
    return null;
  }

  return (profileConfig as Record<string, unknown>)[key];
}

/**
 * Persists a single config key to the logged-in user's profile, merging
 * with the existing profile.config so other keys aren't clobbered. No-ops
 * if the user isn't authenticated or the value matches what's already saved.
 *
 * Also no-ops while `login.profile` hasn't loaded yet. `profile` is fetched
 * asynchronously after login, so a null profile while `userId` is set means
 * the fetch is still in flight — not that the profile is empty. Writing in
 * that window would save a bare `{ name: "" }` profile and permanently wipe
 * whatever was actually stored on the account once the write lands.
 */
export async function saveProfileConfigValue(
  login: LoginManager,
  key: string,
  value: unknown
): Promise<void> {
  if (!login.userId.value) {
    return;
  }

  if (!login.profile.value) {
    if (login.profilePromise) {
      // The load may reject (transient/server/auth failure). Swallow it here —
      // the `profile.value` re-check below is what decides whether it's safe
      // to write, and a rejected load simply means "not safe yet".
      try {
        await login.profilePromise;
      } catch {
        // Intentionally ignored; handled by the guard below.
      }
    }

    if (!login.profile.value) {
      console.warn(
        "Cannot save profile config value: profile has not loaded yet"
      );
      return;
    }
  }

  const existingProfile = login.profile.value;
  const existingConfig =
    existingProfile?.config && typeof existingProfile.config === "object"
      ? (existingProfile.config as Record<string, unknown>)
      : {};

  if (existingConfig[key] === value) {
    return;
  }

  // For object/array values, deep-equality would be ideal but JSON.stringify
  // is sufficient here since we always write parsed/normalized shapes.
  if (
    typeof value === "object" &&
    value !== null &&
    typeof existingConfig[key] === "object" &&
    existingConfig[key] !== null
  ) {
    try {
      if (JSON.stringify(existingConfig[key]) === JSON.stringify(value)) {
        return;
      }
    } catch {
      // Fall through and write anyway.
    }
  }

  login.updateProfile({
    config: {
      ...existingConfig,
      [key]: value,
    },
  });
}
