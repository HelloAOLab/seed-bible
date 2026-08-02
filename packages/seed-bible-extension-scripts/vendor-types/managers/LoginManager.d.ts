import { type Signal } from "@preact/signals";
import * as z from "zod/v4";
import type { CasualOSManager, UserInfo } from "./OsManager";
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
export declare const userProfileSchema: z.ZodObject<
  {
    name: z.ZodString;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pictureUrl: z.ZodNullable<z.ZodOptional<z.ZodURL>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    config: z.ZodNullable<
      z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    >;
  },
  z.core.$strip
>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export declare function createLoginManager({
  os,
}: {
  os: CasualOSManager;
}): LoginManager;
