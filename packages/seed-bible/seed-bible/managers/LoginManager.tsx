import { batch, computed, effect, signal, type Signal } from "@preact/signals";
import * as z from "zod/v4";
import type { CasualOSManager, UserInfo } from "./OsManager";
import type {
  CompleteLoginResult,
  LoginRequestResult,
  LoginRequestSuccess,
} from "@casual-simulation/aux-records/AuthController";

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
   * The user's profile information. Null if the user is not logged in or if the profile has not loaded yet.
   */
  profile: Signal<UserProfile | null>;

  /**
   * The promise that resolves with the user's profile information once it has loaded.
   * Null if the user is not logged in.
   */
  profilePromise: Promise<UserProfile> | null;

  /**
   * Whether the user is currently in the process of logging in, which can be used to show or hide the login modal. This will be true from the moment a login attempt is initiated until it either succeeds or fails, and will be false at all other times (including while logged in). The login modal should subscribe to this signal to know when to show or hide itself, and should call `cancelLogin` if it is closed while a login attempt is in progress to abort the login flow.
   */
  isLoginOpen: Signal<boolean>;

  /**
   * Attempts to login the user.
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

  if (typeof localStorage !== "undefined") {
    const storedSessionKey = localStorage.getItem("sessionKey");
    const storedConnectionKey = localStorage.getItem("connectionKey");

    if (storedSessionKey) {
      sessionKey.value = storedSessionKey;
      client.sessionKey = storedSessionKey;

      const expireTime = parsedSessionKey.value!.expireTimeMs;
      const timeUntilExpire = expireTime - Date.now();
      // Refresh the session 1 week before it expires
      const refreshTime = timeUntilExpire - 7 * 24 * 60 * 60 * 1000;

      if (refreshTime > 0) {
        setTimeout(() => {
          refreshSession();
        }, refreshTime);
      } else {
        console.log("[LoginManager] Session is expiring soon, refreshing now");
        refreshSession();
      }
    }

    if (storedConnectionKey) {
      connectionKey.value = storedConnectionKey;
    }
  }

  let loginPromise: Promise<UserInfo | null> | null = null;
  let resolveLoginPromise: ((value: UserInfo | null) => void) | null = null;
  let rejectLoginPromise: ((err: Error) => void) | null = null;
  let currentLoginPromise: Promise<UserInfo | null> | null = null;

  // const userId = os.userId;
  const profile = signal<UserProfile | null>(null);
  let profilePromise: Promise<UserProfile> | null = null;
  // Tracks which account `profile.value` currently belongs to, so an account
  // switch can never leave the previous account's profile in place (which a
  // later write would then merge into the new account's record).
  let profileUserId: string | null = null;

  const getUserProfile = async (userId: string): Promise<UserProfile> => {
    const data = await os.getData(userId, "profile");

    if (!data.success) {
      if (data.errorCode === "data_not_found") {
        // The account genuinely has no profile record yet (new user). A blank
        // default is the correct, authoritative answer here — the user can
        // start filling it in and writes should be allowed.
        console.log("[LoginManager] No profile data found for user:", userId);
        return {
          name: "",
        };
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
    if (!sessionKey.value) {
      return;
    }

    console.log("[LoginManager] Refreshing session with existing session key");
    const result = await client.replaceSession();

    if (result.success) {
      console.log("[LoginManager] Session refreshed successfully");
      sessionKey.value = result.sessionKey;
      connectionKey.value = result.connectionKey;
      client.sessionKey = result.sessionKey;
      await loadUserInfo();
    } else {
      console.warn(
        "[LoginManager] Failed to refresh session, clearing session key:",
        result.errorMessage
      );
    }
  }

  async function cancelLogin() {
    if (loginPromise && rejectLoginPromise) {
      rejectLoginPromise(new Error("Login cancelled"));
      loginPromise = null;
      resolveLoginPromise = null;
      rejectLoginPromise = null;
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
    if (!sessionKey.value || !userId.value) {
      return null;
    }

    const result = await client.getUserInfo({ userId: userId.value });
    if (result.success) {
      userInfo.value = {
        id: userId.value,
        email: result.email,
      };
      if (resolveLoginPromise) {
        resolveLoginPromise(userInfo.value);
        resolveLoginPromise = null;
        rejectLoginPromise = null;
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
        loginPromise = new Promise((resolve, reject) => {
          resolveLoginPromise = resolve;
          rejectLoginPromise = reject;
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
    loadUserInfo();
  }

  const logout = async (): Promise<void> => {
    if (sessionKey.value) {
      await client.revokeSession({
        sessionKey: sessionKey.value!,
      });
    }
    batch(() => {
      sessionKey.value = null;
      connectionKey.value = null;
    });
  };

  effect(() => {
    if (!userId.value) {
      profile.value = null;
      profileUserId = null;
      return;
    }

    // If the profile we're holding belongs to a different account — i.e. the
    // user switched accounts without a full logout clearing it first — drop it
    // now so we never display, or (via a later write) merge, one account's
    // profile under another's id.
    if (profileUserId !== null && profileUserId !== userId.value) {
      profile.value = null;
      profileUserId = null;
    }

    if (typeof posthog !== "undefined" && posthog) {
      console.log(
        "[LoginManager] Identifying PostHog with auth bot ID:",
        userInfo.value
      );
      posthog.identify(userId.value);
    }

    const loadingForUserId = userId.value;
    const loadPromise = getUserProfile(loadingForUserId)
      .then((p) => {
        // Guard against a stale load resolving after the user switched
        // (e.g. logout, then a different login) — don't apply an old
        // account's profile over the current one.
        if (userId.value === loadingForUserId) {
          profile.value = p;
          profileUserId = loadingForUserId;
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

    updateUserProfile(userId.value, nextProfile);
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
    profile,
    // Exposed as a getter so external readers see the promise assigned by the
    // profile-loading effect below. A plain property would capture the value
    // at construction time (null), which stays null after a fresh login and
    // silently defeats `saveProfileConfigValue`'s "wait for the profile to
    // load" guard.
    get profilePromise() {
      return profilePromise;
    },

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
