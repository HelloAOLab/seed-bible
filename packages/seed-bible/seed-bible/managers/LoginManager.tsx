import { batch, computed, effect, signal, type Signal } from "@preact/signals";
import * as z from "zod/v4";
import type { CasualOSManager, UserInfo } from "./OsManager";
import type { FatalSessionErrorCode } from "./SessionGuard";
import type {
  CompleteLoginResult,
  LoginRequestResult,
  LoginRequestSuccess,
} from "@casual-simulation/aux-records/AuthController";

/**
 * Why a session ended without the user asking it to.
 *
 * Every cause collapses to two things the UI has to explain, so the mapping happens
 * here rather than in the view — a view only ever needs two messages, and adding
 * another cause changes no view code.
 *
 * `signed_out` deliberately avoids saying "expired". Only one of the causes actually
 * is an expiry: `invalid_key` means the session was revoked or is unrecognised, and an
 * unparseable stored key never expired either. The remedy is the same in every case,
 * so one accurate message beats a specific but often wrong one.
 */
export type SessionEndedReason = "signed_out" | "account_suspended";

export interface SessionEndedEvent {
  reason: SessionEndedReason;

  /**
   * Monotonically increasing id, so two events with the same reason still notify
   * subscribers (signals skip notification when the new value is `===` the old one).
   */
  id: number;
}

export interface LoginManager {
  /**
   * The ID of the user. Null if the user is not authenticated.
   */
  userId: Signal<string | null>;

  /**
   * The connection ID for the current session.
   */
  connectionId: string;

  /**
   * The user's information, including email. Null if the user is not authenticated or if background auth has not completed yet.
   */
  userInfo: Signal<UserInfo | null>;

  /**
   * The current auth bot. Null if not authenticated or if background auth has not completed yet.
   */
  authBot: Signal<UserInfo | null>;

  /**
   * Fires when the user was signed out without asking — because the server reported
   * their session key dead, or their account suspended. Null until that happens.
   *
   * Only set when a forced sign-out actually took place, so a sign-out the user asked
   * for and a request that merely failed never produce an event. The UI reads `reason`
   * to pick which message to show.
   */
  sessionEnded: Signal<SessionEndedEvent | null>;

  /**
   * The user's profile information. Null if the user is not logged in or if the profile has not loaded yet.
   */
  profile: Signal<UserProfile | null>;

  /**
   * A locally-cached copy of the current user's last confirmed profile, persisted to
   * `localStorage` and read back immediately when the app loads — before the network
   * fetch backing `profile` has resolved. Display-only: it exists so the UI has
   * something to show instantly instead of blank/loading. It is NOT a substitute for
   * `profile` when deciding whether it's safe to write — writes must keep gating on
   * `profile`, which stays null until the network genuinely confirms it. Reset to null
   * on logout and on switching accounts; an explicit logout also erases the stored
   * copy (of every account) from the device, so nothing personal outlives the session.
   */
  cachedProfile: Signal<UserProfile | null>;

  /**
   * A device-only (not tied to any account) config bag for use before/without login.
   * `saveProfileConfigValue` writes here when there is no authenticated user. The first
   * time a brand-new account (one with no existing profile record) logs in, this is
   * adopted as the starting `profile.config` and then cleared.
   */
  localConfig: Signal<Record<string, unknown>>;

  /**
   * Applies the device's real saved `localConfig` from `localStorage`,
   * merged under whatever is already there. `localConfig` seeds empty (to
   * match SSR); call this once from a post-mount effect to bring in the
   * device's real settings without risking a hydration mismatch.
   */
  hydrateLocalConfig: () => void;

  /**
   * The promise that resolves with the user's profile information once it has loaded.
   * Null if the user is not logged in.
   */
  profilePromise: Promise<UserProfile> | null;

  /**
   * Whether the user's profile is currently being fetched from storage. True
   * from the moment a load begins until it resolves or fails; false when logged
   * out and once a load settles. The account page reads this to show a loading
   * state instead of an empty, editable form while the fetch is still in flight
   * (which on a poor connection can take a while).
   */
  isProfileLoading: Signal<boolean>;

  /**
   * Whether a profile write started by `updateProfile` is currently being
   * persisted to storage. True while at least one write is in flight, false
   * once they all settle. The account page's "Save changes" button reads this
   * to show a "Saving…" indicator — important on a poor connection, where the
   * write (which happens optimistically in the UI) can take a while to land.
   */
  isSavingProfile: Signal<boolean>;

  /**
   * Whether the user is currently in the process of logging in, which can be used to show or hide the login modal. This will be true from the moment a login attempt is initiated until it either succeeds or fails, and will be false at all other times (including while logged in). The login modal should subscribe to this signal to know when to show or hide itself, and should call `cancelLogin` if it is closed while a login attempt is in progress to abort the login flow.
   */
  isLoginOpen: Signal<boolean>;

  /**
   * Attempts to login the user.
   *
   * Resolves with the signed-in user, or `null` when no account was obtained —
   * including when the user dismisses the prompt. Dismissal is deliberately not
   * a rejection: callers offer sign-in as a convenience and carry on without an
   * account, so throwing would abandon whatever the user was actually doing.
   */
  login: () => Promise<UserInfo | null>;

  /**
   * Attempts to log out the user.
   */
  logout: () => Promise<void>;

  /**
   * Updates the user's profile information.
   */
  updateProfile: (newData: Partial<UserProfile>) => void;

  /**
   * Gets the user's profile information from storage.
   * @param userId The ID of the user to get the profile for.
   * @returns A promise that resolves with the profile information for the user.
   */
  getUserProfile: (userId: string) => Promise<UserProfile>;

  /**
   * Prompts the user to upload a profile picture, stores it as a public file
   * record, and saves the resulting URL to the user's profile.
   * Resolves without changes if no file is selected or the user is not authenticated.
   */
  uploadProfilePicture: (file: File) => Promise<void>;

  /**
   * Cancels an in-progress login attempt, if one exists. This is useful to abort a login flow if the user navigates away or closes the login modal before completing authentication.
   *
   * Any pending {@link login} call resolves with `null`.
   */
  cancelLogin: () => Promise<void>;

  /**
   * Requests a login code to be sent to the given email address.
   * @param email The email address to which the login code should be sent.
   */
  requestLoginByEmail: (email: string) => Promise<LoginRequestResult>;

  /**
   * Submits a login code received by email to complete the login process. Resolves with the result of the login attempt, including success status and session information if successful.
   * @param code The code received by the user via email to complete login.
   * @param request The original login request information returned by `requestLoginByEmail`, which includes the request ID and user ID needed to complete the login.
   */
  submitLoginCode: (
    code: string,
    request: LoginRequestSuccess
  ) => Promise<CompleteLoginResult>;
}

export const userProfileSchema = z.object({
  name: z.string().max(100),
  location: z.string().max(100).nullable().optional(),
  pictureUrl: z.url().max(1024).optional().nullable(),
  description: z.string().max(300).optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

const PROFILE_CACHE_KEY_PREFIX = "sb-profile-cache-";
const LOCAL_CONFIG_STORAGE_KEY = "sb-profile-config-local";
// Sanity caps for the anonymous local config store. Every real key it holds
// today (font size, theme id, book orientation, etc.) is tiny, so these are
// generous — they exist to reject corrupt/tampered-with storage, not to
// constrain legitimate use. This matters because a brand-new account's
// first login adopts this data verbatim into its profile (see
// `getUserProfile`'s `data_not_found` branch) — unlike `readCachedProfile`,
// there's no fixed schema to validate this free-form bag against, so a
// size/shape sanity check is the next best thing to keep corrupt data from
// becoming durable account state.
const MAX_LOCAL_CONFIG_JSON_LENGTH = 50_000;
const MAX_LOCAL_CONFIG_KEYS = 100;

function readCachedProfile(userId: string): UserProfile | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY_PREFIX + userId);
    if (!raw) {
      return null;
    }
    const parsed = userProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // Ignore malformed/unavailable storage; fall back to no cached profile.
    return null;
  }
}

function writeCachedProfile(userId: string, profile: UserProfile): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(
      PROFILE_CACHE_KEY_PREFIX + userId,
      JSON.stringify(profile)
    );
  } catch {
    // Best-effort; the profile record on the server is the durable source of truth.
  }
}

/**
 * Removes every cached profile on this device.
 *
 * Called on explicit sign-out. Clearing only the departing account's entry
 * would be enough to stop `cachedProfile` from showing it again, but the
 * point is that "Sign out" shouldn't leave a readable name/location/picture
 * behind on a shared machine — and entries belonging to accounts that
 * switched away without a full logout would otherwise never be cleaned up
 * (nothing evicts them, so they accumulate one per account, indefinitely).
 * Dropping all of them costs nothing: only one account can be signed in per
 * browser, and this is purely a display cache that the next successful
 * profile load rewrites.
 */
function clearCachedProfiles(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    // Collect first, then remove — removing while walking by index shifts the
    // remaining entries and would skip some of them.
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PROFILE_CACHE_KEY_PREFIX)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  } catch {
    // Best-effort; storage may be unavailable (private mode, blocked).
  }
}

function readLocalConfig(): Record<string, unknown> {
  if (typeof localStorage === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    if (raw.length > MAX_LOCAL_CONFIG_JSON_LENGTH) {
      console.warn(
        "[LoginManager] Ignoring oversized local config store; treating as corrupt"
      );
      return {};
    }
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length <= MAX_LOCAL_CONFIG_KEYS
    ) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed/unavailable storage; fall back to an empty cache.
  }
  return {};
}

function writeLocalConfig(config: Record<string, unknown>): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(LOCAL_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Best-effort; this is a device-local convenience cache.
  }
}

export function createLoginManager({
  os,
}: {
  os: CasualOSManager;
}): LoginManager {
  const { client, parsedSessionKey, sessionKey, connectionKey } = os;

  const isLoginOpen = signal(false);
  const userId = computed(() => parsedSessionKey.value?.userId ?? null);
  const userInfo = signal<UserInfo | null>(null);
  const currentLoginRequest = signal<LoginRequestSuccess | null>(null);
  const sessionEnded = signal<SessionEndedEvent | null>(null);
  let sessionEndedCount = 0;

  // True while a deliberate `logout()` is tearing the session down. The sign-out
  // request itself often comes back `session_expired`, and any other request in
  // flight at that moment can too. Neither should be reported to someone who just
  // pressed "Sign out".
  let isSigningOut = false;

  /**
   * Drops every trace of the current session from memory. That is the whole teardown:
   * the persistence effect below mirrors the nulled signals into `localStorage`,
   * `OsManager`'s effect clears `client.sessionKey`, and the profile effect clears the
   * profile because `userId` becomes null.
   */
  const clearSession = () => {
    // Wipe the on-disk profile cache before dropping the session. The effect
    // below already nulls the `cachedProfile` signal once `userId` goes null,
    // but that only clears what's in memory — the stored copy would otherwise
    // outlive the session with the user's name, location, description and
    // picture URL still readable on the device.
    clearCachedProfiles();
    batch(() => {
      sessionKey.value = null;
      connectionKey.value = null;
      userInfo.value = null;
    });
  };

  /**
   * Signs the user out for a reason that isn't their choice, and records why so the UI
   * can explain it.
   *
   * Deliberately does NOT call `revokeSession`. Every caller gets here because the
   * session is already unusable — expired, revoked, banned, or a key we can't even
   * parse — so the call could only fail; it costs a round trip on a path often taken
   * while connectivity is poor; and for a banned account it can never succeed.
   *
   * Also opens the login screen. A forced sign-out only happens when there was a real
   * session, so the user was not anonymous — offering sign-in again is a convenience,
   * not a hindrance. (A deliberate `logout()` does not go through here.)
   *
   * `sessionEnded` is left set rather than reset, which is what lets a sign-out during
   * construction still reach the toast: `SeedBibleStateManager` wires that effect much
   * later, and an effect reads its dependencies eagerly on its first run. Don't
   * "tidy" this into a reset-after-read.
   */
  const forceSignOut = (reason: SessionEndedReason) => {
    if (isSigningOut) {
      // A sign-out the user asked for is already tearing the session down.
      return;
    }

    if (!sessionKey.peek()) {
      // Already signed out. Makes this safe to call repeatedly, which is what keeps
      // a screenful of simultaneously-failing reads from stacking up.
      return;
    }

    clearSession();
    sessionEnded.value = {
      reason,
      id: ++sessionEndedCount,
    };
    // Skip during SSR — there is no interactive login surface to show.
    if (!import.meta.env.SSR) {
      isLoginOpen.value = true;
    }
  };

  /** Signs the user out because the server reported the session key dead. */
  const forceLogout = (errorCode: FatalSessionErrorCode) => {
    console.warn(
      `[LoginManager] Signing out: the server reported '${errorCode}'.`
    );
    forceSignOut(
      errorCode === "user_is_banned" ? "account_suspended" : "signed_out"
    );
  };

  effect(() => {
    const event = os.sessionInvalidated.value;
    if (!event) {
      return;
    }
    forceLogout(event.errorCode);
  });

  // Known hydration-mismatch risk: unlike `localConfig` below, this reads
  // `localStorage` and applies it immediately instead of being deferred to a
  // `hydrate*()` function called from a post-mount effect. Left as-is here —
  // deferring it touches ~15 tests in LoginManager.test.ts that assert on
  // synchronous restoration and would delay a returning user's background
  // session refresh/login — tracked as follow-up work rather than fixed here.
  /* eslint-disable seed-bible-hydration/no-immediate-storage-access */
  if (typeof localStorage !== "undefined") {
    const storedSessionKey = localStorage.getItem("sessionKey");
    const storedConnectionKey = localStorage.getItem("connectionKey");

    if (storedSessionKey) {
      sessionKey.value = storedSessionKey;
      client.sessionKey = storedSessionKey;
    }

    if (storedConnectionKey) {
      connectionKey.value = storedConnectionKey;
    }

    // Validate only after both keys are restored, so discarding a bad session key takes
    // the connection key with it. Checking earlier would clear a connection key that the
    // block above then puts straight back.
    if (storedSessionKey) {
      const parsed = parsedSessionKey.value;

      if (!parsed) {
        // The stored key isn't parseable, so there's no expiry to schedule against and
        // nothing useful we could do with it. Reading `.expireTimeMs` off the null
        // parse used to throw here, and nothing catches it — this runs inside
        // `createSeedBibleState`, which `app/init.tsx` calls bare — so one bad
        // character in localStorage meant a blank page with no way to sign out of it.
        // Discarding the key lets the app start normally, signed out.
        console.warn(
          "[LoginManager] Discarding an unparseable stored session key."
        );
        forceSignOut("signed_out");
      } else {
        const timeUntilExpire = parsed.expireTimeMs - Date.now();
        // Refresh the session 1 week before it expires
        const refreshTime = timeUntilExpire - 7 * 24 * 60 * 60 * 1000;

        if (refreshTime > 0) {
          setTimeout(() => {
            refreshSession();
          }, refreshTime);
        } else {
          console.log(
            "[LoginManager] Session is expiring soon, refreshing now"
          );
          refreshSession();
        }
      }
    }
  }
  /* eslint-enable seed-bible-hydration/no-immediate-storage-access */

  let loginPromise: Promise<UserInfo | null> | null = null;
  let resolveLoginPromise: ((value: UserInfo | null) => void) | null = null;
  let currentLoginPromise: Promise<UserInfo | null> | null = null;

  // const userId = os.userId;
  const profile = signal<UserProfile | null>(null);
  const cachedProfile = signal<UserProfile | null>(null);
  // Seeded empty — matching SSR, which has no `localStorage` at all — rather
  // than reading real `localStorage` here immediately. `createSeedBibleState`
  // (and everything downstream that derives from `localConfig`, e.g.
  // `SettingsManager`/`ThemeManager`) runs before Preact's first
  // render/hydrate pass, so an eager real read here would make the client's
  // first render disagree with what the server produced. `hydrateLocalConfig`
  // (below) applies the real value once, from a post-mount effect — see
  // `MainBody` in `app/main.tsx`.
  const localConfig = signal<Record<string, unknown>>({});
  const isProfileLoading = signal(false);
  const isSavingProfile = signal(false);
  // Counts profile writes currently in flight so overlapping writes (e.g. a
  // manual save while a background config write is still persisting) don't let
  // the first one to finish clear the "Saving…" state out from under the other.
  let pendingProfileWrites = 0;
  let profilePromise: Promise<UserProfile> | null = null;
  // Tracks which account `profile.value` currently belongs to, so an account
  // switch can never leave the previous account's profile in place (which a
  // later write would then merge into the new account's record).
  let profileUserId: string | null = null;
  // Tracks which account `cachedProfile.value` currently belongs to. Kept
  // separate from `profileUserId` (which is only set once a load *succeeds*)
  // so a switch that happens while the previous account's load is still
  // pending — or after it failed — is still caught: gating on "is
  // `cachedProfile` null" isn't enough once a value has been assigned.
  let cachedProfileUserId: string | null = null;

  // Persist `localConfig` on every change. Skip the effect's first,
  // unconditional run: `localConfig` is seeded EMPTY above (to match SSR) and
  // only gets the device's real saved settings later, in
  // `hydrateLocalConfig()`. Without this guard the first run would persist
  // that empty seed straight over `localStorage`, wiping every returning
  // visitor's settings before they were ever read back. Do not remove it.
  let isFirstLocalConfigWrite = true;
  effect(() => {
    const config = localConfig.value;
    if (isFirstLocalConfigWrite) {
      isFirstLocalConfigWrite = false;
      return;
    }
    writeLocalConfig(config);
  });

  /**
   * Reads the device's real anonymous local config from `localStorage` and
   * applies it. Call once, from a post-mount effect, to correct the
   * SSR-matching empty seed (see `localConfig` above) to the device's real
   * saved settings right after Preact's first commit —
   * `SettingsManager`'s own `effect()` already depends on `localConfig` and
   * re-derives automatically, so nothing downstream needs to change.
   *
   * Merges the disk read UNDER the current in-memory value (rather than
   * overwriting outright), so a setter that already fired in the brief
   * window before this runs isn't clobbered by the (now-stale) disk
   * snapshot for that same key.
   */
  const hydrateLocalConfig = () => {
    localConfig.value = { ...readLocalConfig(), ...localConfig.value };
  };

  const getUserProfile = async (userId: string): Promise<UserProfile> => {
    const data = await os.getData(userId, "profile");

    if (!data.success) {
      if (data.errorCode === "data_not_found") {
        // The account genuinely has no profile record yet (new user). A blank
        // default is the correct, authoritative answer here — the user can
        // start filling it in and writes should be allowed.
        console.log("[LoginManager] No profile data found for user:", userId);

        const seededConfig = localConfig.value;
        const hasSeededConfig = Object.keys(seededConfig).length > 0;
        const seedProfile: UserProfile = hasSeededConfig
          ? { name: "", config: seededConfig }
          : { name: "" };

        if (hasSeededConfig) {
          // This device has config saved from anonymous use (e.g. font size,
          // theme) and this is the first time this brand-new account has
          // logged in. Adopt it as the account's starting profile so those
          // choices aren't lost when the user signs up.
          try {
            await updateUserProfile(userId, seedProfile);
            // Adoption succeeded and is now durable on the account — clear the
            // local store so it can't later be silently adopted by a
            // different account created on the same (possibly shared) device.
            localConfig.value = {};
          } catch (err) {
            console.warn(
              "[LoginManager] Failed to persist locally-saved config to new account; leaving it in the local store to retry on next login",
              err
            );
          }
        }

        return seedProfile;
      }

      // Any other failure (server error, `not_authorized`, network blip — all
      // common on mobile) is transient: the profile may well exist, we just
      // couldn't read it right now. We must NOT fall back to a blank profile,
      // because the caller stores it in `profile.value` and the next config
      // write (`saveProfileConfigValue` / `updateProfile`) merges into it and
      // persists it — permanently wiping the real name/location/picture and
      // every other config key. Surface the failure instead so callers keep
      // whatever profile they already had.
      throw new Error(
        `[LoginManager] Failed to load profile (${data.errorCode}): ${data.errorMessage}`
      );
    }

    const parsed = userProfileSchema.safeParse(data.data);

    if (!parsed.success) {
      // The record exists but doesn't match the expected shape. Returning a
      // blank default here would also let the next write clobber the stored
      // record, so treat it as a load failure rather than an empty profile.
      console.warn("Failed to parse user profile data:", parsed.error);
      throw new Error("[LoginManager] Stored profile failed validation");
    }

    // This account already has a real profile, so no adoption happened —
    // but any leftover anonymous local config must still be consumed here.
    // Otherwise it would sit around and could later be silently adopted by a
    // different, unrelated account signing up on this same (possibly
    // shared) device — the exact leak the brand-new-account adoption/clear
    // above exists to prevent, just via this other path.
    if (Object.keys(localConfig.value).length > 0) {
      localConfig.value = {};
    }

    return parsed.data;
  };

  const updateUserProfile = async (
    userId: string,
    profile: UserProfile
  ): Promise<void> => {
    await os.recordData(userId, "profile", profile, {
      marker: "publicRead",
    });
  };

  async function refreshSession() {
    const sessionKeyAtRequest = sessionKey.peek();
    if (!sessionKeyAtRequest) {
      return;
    }

    console.log("[LoginManager] Refreshing session with existing session key");
    const result = await client.replaceSession();

    if (sessionKey.peek() !== sessionKeyAtRequest) {
      // The session ended while the refresh was in flight — the user signed out, or
      // this very call reported the key dead and the session guard already signed
      // them out. Assigning a key now would resurrect a session we just dropped.
      return;
    }

    if (result.success) {
      console.log("[LoginManager] Session refreshed successfully");
      sessionKey.value = result.sessionKey;
      connectionKey.value = result.connectionKey;
      client.sessionKey = result.sessionKey;
      await loadUserInfo();
    } else {
      // Nothing is cleared here, on purpose. A refresh fails for transient reasons
      // far more often than real ones (a mobile dead spot, a 500, a rate limit), and
      // the key is usually still good for another week. The three codes that really
      // do mean the session is gone are handled centrally by the session guard,
      // which has already signed the user out by the time we reach this branch.
      console.warn(
        "[LoginManager] Failed to refresh session; keeping the existing session key:",
        result.errorCode,
        result.errorMessage
      );
    }
  }

  async function cancelLogin() {
    isLoginOpen.value = false;
    if (loginPromise && resolveLoginPromise) {
      // Resolves null rather than rejecting. Dismissing the prompt is an
      // answer ("carry on without an account"), not a failure, and every
      // caller is written to read that answer from the resolved value. A
      // rejection instead threw out of the caller mid-way, which is what
      // stopped a dismissed prompt from leaving a signed-out user able to
      // write a note (#1591).
      resolveLoginPromise(null);
      loginPromise = null;
      resolveLoginPromise = null;
    }
  }

  async function requestLoginByEmail(
    email: string
  ): Promise<LoginRequestResult> {
    const result = await client.requestLogin({
      address: email,
      addressType: "email",
      comId: "seed-bible",
    });

    if (result.success) {
      currentLoginRequest.value = result;
    } else {
      currentLoginRequest.value = null;
    }

    return result;
  }

  async function submitLoginCode(
    code: string,
    request: LoginRequestSuccess
  ): Promise<CompleteLoginResult> {
    const result = await client.completeLogin({
      code,
      requestId: request.requestId,
      userId: request.userId,
    });

    currentLoginRequest.value = null;
    if (result.success) {
      sessionKey.value = result.sessionKey;
      connectionKey.value = result.connectionKey;
      client.sessionKey = result.sessionKey;

      await loadUserInfo();
    }

    return result;
  }

  async function loadUserInfo(): Promise<UserInfo | null> {
    const sessionKeyAtRequest = sessionKey.peek();
    if (!sessionKeyAtRequest || !userId.value) {
      return null;
    }

    const result = await client.getUserInfo({ userId: userId.value });

    if (sessionKey.peek() !== sessionKeyAtRequest || !userId.value) {
      // Signed out while the request was in flight — quite possibly by this very
      // request failing. Publishing user info for a session that no longer exists
      // would leave the app looking signed in.
      return null;
    }

    if (result.success) {
      userInfo.value = {
        id: userId.value,
        email: result.email,
      };
      // Close even when login was opened by a forced sign-out (no `login()`
      // promise) — that path never reaches `loginCore`'s `finally`.
      isLoginOpen.value = false;
      if (resolveLoginPromise) {
        resolveLoginPromise(userInfo.value);
        resolveLoginPromise = null;
        loginPromise = null;
      }

      return userInfo.value;
    } else {
      return null;
    }
  }

  async function loginCore(): Promise<UserInfo | null> {
    if (!sessionKey.value) {
      if (!loginPromise) {
        loginPromise = new Promise((resolve) => {
          resolveLoginPromise = resolve;
        });
      }

      // prompt for login
      try {
        isLoginOpen.value = true;
        return await loginPromise;
      } finally {
        isLoginOpen.value = false;
      }
    }

    return await loadUserInfo();
  }

  function login(): Promise<UserInfo | null> {
    if (userInfo.value) {
      return Promise.resolve(userInfo.value);
    }

    if (import.meta.env.SSR) {
      return Promise.resolve(null);
    }

    if (!currentLoginPromise) {
      currentLoginPromise = loginCore().finally(
        () => (currentLoginPromise = null)
      );
    }

    return currentLoginPromise;
  }

  effect(() => {
    if (typeof localStorage !== "undefined") {
      if (!sessionKey.value) {
        localStorage.removeItem("sessionKey");
      } else {
        localStorage.setItem("sessionKey", sessionKey.value);
      }

      if (!connectionKey.value) {
        localStorage.removeItem("connectionKey");
      } else {
        localStorage.setItem("connectionKey", connectionKey.value);
      }
    }
  });

  if (sessionKey.value) {
    // Nobody awaits this, so it needs its own handler: a network failure here would
    // otherwise surface as an unhandled rejection on every offline page load. A
    // failure is survivable — the session stays as it is, and the session guard has
    // already signed the user out if the server said the key was dead.
    loadUserInfo().catch((err) => {
      console.warn("[LoginManager] Failed to load user info on startup", err);
    });
  }

  const logout = async (): Promise<void> => {
    isSigningOut = true;
    try {
      if (sessionKey.value) {
        try {
          await client.revokeSession({
            sessionKey: sessionKey.value,
          });
        } catch (err) {
          // Never let a failed round trip keep us signed in locally: the user asked
          // to sign out, so sign out. Before this, a rejection here threw past the
          // clear below and left the app looking logged in — and the sign-out button
          // calls this with `void`, so the rejection went unhandled too.
          console.warn(
            "[LoginManager] Failed to revoke the session remotely; signing out locally anyway",
            err
          );
        }
      }
      clearSession();
    } finally {
      isSigningOut = false;
    }
  };

  effect(() => {
    if (!userId.value) {
      profile.value = null;
      profileUserId = null;
      // Logging out drops the per-account cache too — the next display falls
      // back to `localConfig`/anonymous defaults, never a stale account's data.
      cachedProfile.value = null;
      cachedProfileUserId = null;
      isProfileLoading.value = false;
      return;
    }

    // If the profile we're holding belongs to a different account — i.e. the
    // user switched accounts without a full logout clearing it first — drop it
    // now so we never display, or (via a later write) merge, one account's
    // profile under another's id.
    if (profileUserId !== null && profileUserId !== userId.value) {
      profile.value = null;
      profileUserId = null;
      cachedProfile.value = null;
    }

    if (typeof posthog !== "undefined" && posthog) {
      console.log(
        "[LoginManager] Identifying PostHog with auth bot ID:",
        userInfo.value
      );
      posthog.identify(userId.value);
    }

    const loadingForUserId = userId.value;

    // Show the last-known cached profile for this account immediately, while
    // the network load below is still in flight. This is display-only —
    // `profile`/`profileUserId` (what writes gate on) are untouched here.
    // Keyed on `cachedProfileUserId` rather than "is `cachedProfile` null" —
    // gating on nullness alone would miss a switch that happens while the
    // previous account's load is still pending, or after it failed, since
    // `cachedProfile` would already hold a (now-stale) non-null value from
    // that previous account.
    if (cachedProfileUserId !== loadingForUserId) {
      cachedProfile.value = readCachedProfile(loadingForUserId);
      cachedProfileUserId = loadingForUserId;
    }

    isProfileLoading.value = true;
    const loadPromise = getUserProfile(loadingForUserId)
      .then((p) => {
        // Guard against a stale load resolving after the user switched
        // (e.g. logout, then a different login) — don't apply an old
        // account's profile over the current one.
        if (userId.value === loadingForUserId) {
          profile.value = p;
          profileUserId = loadingForUserId;
          cachedProfile.value = p;
          cachedProfileUserId = loadingForUserId;
          writeCachedProfile(loadingForUserId, p);
          if (import.meta.env.DEV) {
            console.log("[LoginManager] Profile loaded:", p);
          }
        }
        return p;
      })
      .catch((err) => {
        // A transient load failure must not disturb whatever profile we
        // already hold. Leaving `profile.value` untouched (previous value or
        // null) is what keeps a network blip from turning into an account
        // wipe: writes only merge into a real, successfully-loaded profile,
        // never into a blank fallback.
        console.warn(
          "[LoginManager] Failed to load user profile; keeping existing profile",
          err
        );
        // If we already have a profile loaded, treat the promise as resolved
        // with it so awaiters (e.g. saveProfileConfigValue) can proceed
        // against the good data instead of hitting an unhandled rejection.
        // Only do so when the load is still current and the held profile
        // belongs to this account (the account-switch clear above guarantees a
        // non-null profile.value here belongs to loadingForUserId). Otherwise
        // rethrow so a stale/foreign profile is never handed back.
        if (userId.value === loadingForUserId && profile.value) {
          return profile.value;
        }
        throw err;
      })
      .finally(() => {
        // Only clear the flag for the load that is still current. A stale load
        // settling after an account switch must not turn off the spinner that
        // belongs to the newer account's in-flight load.
        if (userId.value === loadingForUserId) {
          isProfileLoading.value = false;
        }
      });

    // Attach a passive rejection handler so a load failure that nobody awaits
    // doesn't surface as an unhandled promise rejection (which would fire on
    // every transient failure). Real awaiters of `profilePromise` — e.g.
    // `saveProfileConfigValue` — still receive the rejection.
    loadPromise.catch(() => undefined);
    profilePromise = loadPromise;
  });

  effect(() => {
    const info = userInfo.value;
    if (info && typeof posthog !== "undefined" && posthog) {
      posthog.setPersonProperties({
        email: info.email,
      });
    }
  });

  effect(() => {
    const profileData = profile.value;
    if (profileData && typeof posthog !== "undefined" && posthog) {
      posthog.setPersonProperties({
        name: profileData.name,
      });
    }
  });

  const updateProfile = (newData: Partial<UserProfile>) => {
    if (!userId.value) {
      console.warn("Cannot update profile: no authenticated user");
      return;
    }

    if (!profile.value) {
      // The profile hasn't finished loading (or its load failed transiently).
      // Writing now would merge `newData` into a bare `{ name: "" }` base and
      // persist it, wiping whatever is actually stored on the account. Refuse
      // rather than risk the wipe — the caller can retry once the profile is
      // available.
      console.warn("Cannot update profile: profile has not loaded yet");
      return;
    }

    const nextProfile: UserProfile = {
      ...profile.value,
      ...newData,
    };
    profile.value = nextProfile;
    cachedProfile.value = nextProfile;
    writeCachedProfile(userId.value, nextProfile);

    // The signal update above is optimistic; the write below is what actually
    // persists it. Track it so the UI can show a "Saving…" indicator, and
    // catch failures here so this fire-and-forget call can't surface as an
    // unhandled rejection (callers like the config sync don't await it).
    pendingProfileWrites += 1;
    isSavingProfile.value = true;
    updateUserProfile(userId.value, nextProfile)
      .catch((err) => {
        console.error("[LoginManager] Failed to persist profile", err);
      })
      .finally(() => {
        pendingProfileWrites -= 1;
        if (pendingProfileWrites === 0) {
          isSavingProfile.value = false;
        }
      });
  };

  const uploadProfilePicture = async (file: File): Promise<void> => {
    if (!userId.value) {
      console.warn("Cannot upload profile picture: no authenticated user");
      return;
    }

    // Make sure the profile has loaded before we upload anything. `updateProfile`
    // refuses to write while the profile is null (to avoid wiping the account),
    // so persisting the URL would silently no-op if we ran ahead of the load —
    // and the caller would see a resolved promise and report a false success.
    // Failing here, before the (billable) file upload, avoids paying for a file
    // we couldn't attach to the profile anyway.
    if (!profile.value) {
      if (profilePromise) {
        try {
          await profilePromise;
        } catch {
          // Ignored; the guard below turns a failed load into a thrown error.
        }
      }

      if (!profile.value) {
        throw new Error(
          "Failed to upload profile picture: profile has not loaded"
        );
      }
    }

    const result = await os.recordFile(userId.value, file, {
      mimeType: file.type,
      marker: "publicRead",
    });

    if (result.success === false) {
      console.error("Profile picture upload failed:", result);
      throw new Error("Failed to upload profile picture");
    }

    updateProfile({ pictureUrl: result.url });
  };

  return {
    userId,
    connectionId: os.connectionId,
    userInfo,
    authBot: userInfo,
    sessionEnded,
    profile,
    cachedProfile,
    localConfig,
    hydrateLocalConfig,
    // Exposed as a getter so external readers see the promise assigned by the
    // profile-loading effect below. A plain property would capture the value
    // at construction time (null), which stays null after a fresh login and
    // silently defeats `saveProfileConfigValue`'s "wait for the profile to
    // load" guard.
    get profilePromise() {
      return profilePromise;
    },
    isProfileLoading,
    isSavingProfile,

    isLoginOpen,

    login,
    logout,
    updateProfile,
    getUserProfile,
    uploadProfilePicture,

    cancelLogin,
    requestLoginByEmail,
    submitLoginCode,
  };
}
