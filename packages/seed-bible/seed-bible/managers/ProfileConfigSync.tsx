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
 * For object/array values, deep-equality would be ideal but JSON.stringify
 * is sufficient here since config values are always written as
 * parsed/normalized shapes.
 */
function isEqualConfigValue(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (
    typeof a === "object" &&
    a !== null &&
    typeof b === "object" &&
    b !== null
  ) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Persists a single config key to the logged-in user's profile. Thin wrapper
 * around `saveProfileConfigValues` for the common single-key case — see
 * there for the merge/no-op/profile-load-guard behavior.
 */
export async function saveProfileConfigValue(
  login: LoginManager,
  key: string,
  value: unknown
): Promise<void> {
  return saveProfileConfigValues(login, { [key]: value });
}

/**
 * Persists multiple config keys to the logged-in user's profile in a single
 * write, merging with the existing profile.config so other keys aren't
 * clobbered. No-ops if the user isn't authenticated, the profile hasn't
 * loaded yet, or none of the given values differ from what's already saved.
 * Keys whose value is unchanged are left out of the write; if every key is
 * unchanged, no write happens at all.
 *
 * Also no-ops while `login.profile` hasn't loaded yet. `profile` is fetched
 * asynchronously after login, so a null profile while `userId` is set means
 * the fetch is still in flight — not that the profile is empty. Writing in
 * that window would save a bare `{ name: "" }` profile and permanently wipe
 * whatever was actually stored on the account once the write lands.
 *
 * When the profile has already loaded, this runs synchronously up to (and
 * including) the `login.updateProfile` call — no `await` is evaluated on
 * that path — so callers that don't await this still observe the write
 * within the same tick. Only awaits when a profile load is actually pending.
 *
 * Use this (instead of multiple `saveProfileConfigValue` calls) whenever
 * several config keys must always land together — writing them one at a
 * time would call `login.updateProfile` once per key instead of once total.
 */
export async function saveProfileConfigValues(
  login: LoginManager,
  values: Record<string, unknown>
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
        "Cannot save profile config value(s): profile has not loaded yet"
      );
      return;
    }
  }

  const existingProfile = login.profile.value;
  const existingConfig =
    existingProfile?.config && typeof existingProfile.config === "object"
      ? (existingProfile.config as Record<string, unknown>)
      : {};

  const changedEntries = Object.entries(values).filter(
    ([key, value]) => !isEqualConfigValue(existingConfig[key], value)
  );

  if (changedEntries.length === 0) {
    return;
  }

  login.updateProfile({
    config: {
      ...existingConfig,
      ...Object.fromEntries(changedEntries),
    },
  });
}
