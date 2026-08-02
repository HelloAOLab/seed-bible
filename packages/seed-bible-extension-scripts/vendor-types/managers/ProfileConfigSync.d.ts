import type { LoginManager, UserProfile } from "../managers/LoginManager";
/**
 * Reads a value from the user's profile config.
 *
 * Returns `null` when the user is not logged in, the profile hasn't loaded
 * yet, or the key is not set on the profile. Caller is expected to fall
 * back to a local cache (e.g. `configBot.tags`) and parse the result.
 */
export declare function getProfileConfigValue(
  profile: UserProfile | null,
  key: string
): unknown;
/**
 * Persists a single config key to the logged-in user's profile. Thin wrapper
 * around `saveProfileConfigValues` for the common single-key case — see
 * there for the merge/no-op/profile-load-guard behavior.
 */
export declare function saveProfileConfigValue(
  login: LoginManager,
  key: string,
  value: unknown
): Promise<void>;
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
export declare function saveProfileConfigValues(
  login: LoginManager,
  values: Record<string, unknown>
): Promise<void>;
