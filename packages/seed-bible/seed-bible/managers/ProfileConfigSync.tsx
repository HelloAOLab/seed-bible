import type {
  LoginManager,
  UserProfile,
} from "seed-bible.managers.LoginManager";

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
 */
export function saveProfileConfigValue(
  login: LoginManager,
  key: string,
  value: unknown
): void {
  if (!login.userId.value) {
    return;
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
