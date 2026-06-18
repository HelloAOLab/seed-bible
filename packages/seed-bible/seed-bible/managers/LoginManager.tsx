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
   * The user's information, including email. Null if the user is not authenticated or if background auth has not completed yet.
   */
  userInfo: Signal<UserInfo | null>;

  /**
   * The current auth bot. Null if not authenticated or if background auth has not completed yet.
   */
  authBot: Signal<UserInfo | null>;

  /**
   * The user's profile information. Null if the user is not logged in.
   */
  profile: Signal<UserProfile | null>;

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
  uploadProfilePicture: () => Promise<void>;

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

  const getUserProfile = async (userId: string): Promise<UserProfile> => {
    const data = await os.getData(userId, "profile");

    if (!data.success) {
      console.log("[LoginManager] No profile data found for user:", userId);
      // Return a default profile
      return {
        name: "",
      };
    }

    const parsed = userProfileSchema.safeParse(data.data);

    if (!parsed.success) {
      console.warn("Failed to parse user profile data:", parsed.error);
      // Return a default profile
      return {
        name: "",
      };
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
      localStorage.setItem("sessionKey", sessionKey.value ?? "");
      localStorage.setItem("connectionKey", connectionKey.value ?? "");
    }
  });

  if (sessionKey.value) {
    loadUserInfo();
  }

  const logout = async (): Promise<void> => {
    batch(() => {
      sessionKey.value = null;
      connectionKey.value = null;
    });
  };

  effect(() => {
    if (!userId.value) {
      profile.value = null;
      return;
    }

    if (typeof posthog !== "undefined" && posthog) {
      console.log(
        "[LoginManager] Identifying PostHog with auth bot ID:",
        userInfo.value
      );
      posthog.identify(userId.value);
    }

    getUserProfile(userId.value).then((p) => {
      profile.value = p;
    });
  });

  const updateProfile = (newData: Partial<UserProfile>) => {
    if (!userId.value) {
      console.warn("Cannot update profile: no authenticated user");
      return;
    }

    const nextProfile: UserProfile = {
      ...(profile.value ?? { name: "" }),
      ...newData,
    };
    profile.value = nextProfile;

    updateUserProfile(userId.value, nextProfile);
  };

  const uploadProfilePicture = async (): Promise<void> => {
    // TODO: Implement this
    // if (!userId.value) {
    //   console.warn("Cannot upload profile picture: no authenticated user");
    //   return;
    // }
    // const files = await os.showUploadFiles();
    // const file = files?.[0];
    // if (!file) {
    //   throw new Error("No file selected for upload");
    // }
    // const result = await os.recordFile(userId.value, file.data, {
    //   mimeType: file.mimeType,
    //   markers: ["publicRead"],
    // });
    // if (result.success === false) {
    //   console.error("Profile picture upload failed:", result);
    //   throw new Error("Failed to upload profile picture");
    // }
    // updateProfile({ pictureUrl: result.url });
  };

  return {
    userId,
    userInfo,
    authBot: userInfo,
    profile,

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
