import {
  createLoginManager,
  userProfileSchema,
  type LoginManager,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { formatV1SessionKey } from "@casual-simulation/aux-common";
import type { Mock } from "vitest";

vi.setConfig({ testTimeout: 5000 });

// The RecordsClient is a Proxy that synthesizes a network call for every
// accessed method, so we replace the whole module with controllable mocks.
const {
  requestLoginMock,
  completeLoginMock,
  getUserInfoMock,
  replaceSessionMock,
  revokeSessionMock,
} = vi.hoisted(() => ({
  requestLoginMock: vi.fn(),
  completeLoginMock: vi.fn(),
  getUserInfoMock: vi.fn(),
  replaceSessionMock: vi.fn(),
  revokeSessionMock: vi.fn(),
}));

vi.mock("@casual-simulation/aux-records/RecordsClient", () => ({
  createRecordsClient: vi.fn(() => ({
    sessionKey: null as string | null,
    requestLogin: requestLoginMock,
    completeLogin: completeLoginMock,
    getUserInfo: getUserInfoMock,
    replaceSession: replaceSessionMock,
    revokeSession: revokeSessionMock,
  })),
}));

const USER_ID = "user-1";
const EMAIL = "alice@example.com";

// A real, parseable session key so the manager's `parsedSessionKey`/`userId`
// computeds resolve to USER_ID (the manager derives the user id from the key).
const SESSION_KEY = formatV1SessionKey(
  USER_ID,
  "session-1",
  "secret-1",
  Date.now() + 1000 * 60 * 60 * 24 * 14 // 2 weeks
);

// The new key returned by a successful session refresh (replaceSession).
const REFRESHED_SESSION_KEY = formatV1SessionKey(
  USER_ID,
  "session-2",
  "secret-2",
  Date.now() + 1000 * 60 * 60 * 24 * 14 // 2 weeks
);

/** Builds a parseable session key that expires `ms` from now. */
function sessionKeyExpiringIn(ms: number, sessionId = "session-1"): string {
  return formatV1SessionKey(USER_ID, sessionId, "secret-1", Date.now() + ms);
}

/** Wait for a condition to become true, polling the microtask/macrotask queue. */
async function waitFor(
  condition: () => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Lets all currently-queued microtasks/timers flush so promises can settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createLoginManager", () => {
  let os: CasualOSManager;
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let warnSpy: Mock;

  beforeEach(() => {
    localStorage.clear();

    requestLoginMock.mockReset();
    completeLoginMock.mockReset();
    getUserInfoMock.mockReset();
    replaceSessionMock.mockReset();

    requestLoginMock.mockResolvedValue({
      success: true,
      userId: USER_ID,
      requestId: "request-1",
      address: EMAIL,
      addressType: "email",
      expireTimeMs: Date.now() + 1000 * 60 * 5,
    });
    completeLoginMock.mockResolvedValue({
      success: true,
      userId: USER_ID,
      sessionKey: SESSION_KEY,
      connectionKey: "connection-key-1",
      expireTimeMs: Date.now() + 1000 * 60 * 60,
      metadata: {},
    });
    getUserInfoMock.mockResolvedValue({
      success: true,
      email: EMAIL,
    });
    replaceSessionMock.mockResolvedValue({
      success: true,
      sessionKey: REFRESHED_SESSION_KEY,
      connectionKey: "connection-key-2",
      expireTimeMs: Date.now() + 1000 * 60 * 60,
      metadata: {},
    });

    os = CasualOSManager();

    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "No data found for the given key.",
    });
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue(undefined as never);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    localStorage.clear();
    warnSpy.mockRestore();
  });

  /** Persists a session key so a freshly-created manager authenticates on init. */
  function createAuthenticatedManager(): LoginManager {
    localStorage.setItem("sessionKey", SESSION_KEY);
    return createLoginManager({ os });
  }

  describe("login flow", () => {
    it("login() opens the login UI and waits for user info before resolving", async () => {
      const manager = createLoginManager({ os });

      let resolvedInfo: unknown = "pending";
      const promise = manager.login().then((info) => (resolvedInfo = info));

      // The login UI is opened immediately...
      expect(manager.isLoginOpen.value).toBe(true);

      // ...and the promise does not resolve until the flow completes.
      await flush();
      expect(resolvedInfo).toBe("pending");
      expect(getUserInfoMock).not.toHaveBeenCalled();

      // Complete the flow.
      const request = await manager.requestLoginByEmail(EMAIL);
      if (!request.success)
        throw new Error("expected login request to succeed");
      await manager.submitLoginCode("123456", request);

      await promise;
      expect(resolvedInfo).toEqual({ id: USER_ID, email: EMAIL });
      // The UI is closed once login resolves.
      await waitFor(() => manager.isLoginOpen.value === false);
    });

    it("login() called twice resolves with the same promise", async () => {
      const manager = createLoginManager({ os });

      const first = manager.login();
      const second = manager.login();

      expect(second).toBe(first);

      // Complete the flow so the shared promise settles cleanly.
      const request = await manager.requestLoginByEmail(EMAIL);
      if (!request.success)
        throw new Error("expected login request to succeed");
      await manager.submitLoginCode("123456", request);

      await expect(first).resolves.toEqual({ id: USER_ID, email: EMAIL });
      await expect(second).resolves.toEqual({ id: USER_ID, email: EMAIL });
    });

    it("completes the login flow: login() -> requestLoginByEmail() -> submitLoginCode()", async () => {
      const manager = createLoginManager({ os });
      const loginPromise = manager.login();

      const request = await manager.requestLoginByEmail(EMAIL);
      expect(requestLoginMock).toHaveBeenCalledWith({
        address: EMAIL,
        addressType: "email",
        comId: "seed-bible",
      });
      if (!request.success)
        throw new Error("expected login request to succeed");

      const completeResult = await manager.submitLoginCode("123456", request);
      expect(completeLoginMock).toHaveBeenCalledWith({
        code: "123456",
        requestId: "request-1",
        userId: USER_ID,
      });
      expect(completeResult.success).toBe(true);

      await expect(loginPromise).resolves.toEqual({
        id: USER_ID,
        email: EMAIL,
      });
      // The session key is propagated to the records client for authenticated calls.
      expect(os.client.sessionKey).toBe(SESSION_KEY);
    });

    it("can cancel the login flow", async () => {
      const manager = createLoginManager({ os });
      const loginPromise = manager.login();
      expect(manager.isLoginOpen.value).toBe(true);

      await manager.cancelLogin();

      await expect(loginPromise).rejects.toThrow("Login cancelled");
      await waitFor(() => manager.isLoginOpen.value === false);
      expect(getUserInfoMock).not.toHaveBeenCalled();
    });
  });

  describe("background authentication on init", () => {
    it("does not load user info when there is no persisted session key", async () => {
      const manager = createLoginManager({ os });
      await flush();

      expect(manager.isLoginOpen.value).toBe(false);
      expect(manager.userInfo.value).toBeNull();
      expect(requestLoginMock).not.toHaveBeenCalled();
      expect(getUserInfoMock).not.toHaveBeenCalled();
    });

    it("loads the user info when a session key is persisted", async () => {
      localStorage.setItem("sessionKey", SESSION_KEY);

      const manager = createLoginManager({ os });

      // The user info is loaded in the background without opening the login UI.
      // (SESSION_KEY expires soon, so it is also reloaded after the init refresh.)
      await waitFor(() => manager.userInfo.value !== null);
      expect(manager.isLoginOpen.value).toBe(false);
      expect(getUserInfoMock).toHaveBeenCalled();
      expect(manager.userInfo.value).toEqual({ id: USER_ID, email: EMAIL });
    });

    it("loads userId and profile when a session key is persisted", async () => {
      getDataMock.mockResolvedValue({ success: true, data: { name: "Alice" } });

      const manager = createAuthenticatedManager();

      await waitFor(() => manager.userId.value === USER_ID);
      await waitFor(() => manager.profile.value?.name === "Alice");

      expect(getDataMock).toHaveBeenCalledWith(USER_ID, "profile");
    });
  });

  describe("session refresh on init", () => {
    it("refreshes the session immediately when it expires within a week", async () => {
      // SESSION_KEY expires in ~1h, which is well within the 1-week window.
      localStorage.setItem("sessionKey", sessionKeyExpiringIn(1000 * 60 * 60));

      createLoginManager({ os });

      await waitFor(() => replaceSessionMock.mock.calls.length > 0);
      expect(replaceSessionMock).toHaveBeenCalledTimes(1);
    });

    it("propagates the new keys and reloads user info on a successful refresh", async () => {
      localStorage.setItem("sessionKey", sessionKeyExpiringIn(1000 * 60 * 60));

      const manager = createLoginManager({ os });

      await waitFor(() => os.sessionKey.value === REFRESHED_SESSION_KEY);

      expect(os.client.sessionKey).toBe(REFRESHED_SESSION_KEY);
      expect(os.sessionKey.value).toBe(REFRESHED_SESSION_KEY);
      expect(os.connectionKey.value).toBe("connection-key-2");

      // User info is reloaded after the refresh.
      await waitFor(() => manager.userInfo.value !== null);
      expect(getUserInfoMock).toHaveBeenCalled();
      expect(manager.userInfo.value).toEqual({ id: USER_ID, email: EMAIL });
    });

    it("logs a warning and keeps the old keys when the refresh fails", async () => {
      replaceSessionMock.mockResolvedValue({
        success: false,
        errorCode: "unacceptable_session_key",
        errorMessage: "nope",
      });
      const sessionKey = sessionKeyExpiringIn(1000 * 60 * 60);
      localStorage.setItem("sessionKey", sessionKey);

      createLoginManager({ os });

      await waitFor(() => replaceSessionMock.mock.calls.length > 0);
      await flush();

      // The existing keys are left untouched when the refresh fails.
      expect(os.sessionKey.value).toBe(sessionKey);
      expect(os.client.sessionKey).toBe(sessionKey);
      expect(warnSpy).toHaveBeenCalledWith(
        "[LoginManager] Failed to refresh session, clearing session key:",
        "nope"
      );
    });

    it("does not refresh when no session key is persisted", async () => {
      localStorage.setItem(
        "sessionKey",
        sessionKeyExpiringIn(1000 * 60 * 60 * 24 * 8)
      ); // 8 days
      createLoginManager({ os });

      await flush();

      expect(replaceSessionMock).not.toHaveBeenCalled();
    });

    it("does not refresh when the session key is not expiring soon", async () => {
      createLoginManager({ os });

      await flush();

      expect(replaceSessionMock).not.toHaveBeenCalled();
    });
  });

  describe("session refresh scheduling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("schedules the refresh for a week before expiry instead of firing immediately", async () => {
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
      // Expires in 14 days, so the refresh should be scheduled ~7 days out.
      localStorage.setItem("sessionKey", sessionKeyExpiringIn(2 * ONE_WEEK));

      createLoginManager({ os });

      // Nothing should fire on init since the key is more than a week from expiry.
      expect(replaceSessionMock).not.toHaveBeenCalled();

      // Advancing to the scheduled time triggers the refresh.
      await vi.advanceTimersByTimeAsync(ONE_WEEK);
      expect(replaceSessionMock).toHaveBeenCalledTimes(1);
    });
  });

  it("calls revokeSession on logout", async () => {
    revokeSessionMock.mockResolvedValue({ success: true });
    const manager = createAuthenticatedManager();
    const sessionKey = os.sessionKey.value;

    await waitFor(() => manager.userId.value === USER_ID);

    await manager.logout();

    expect(replaceSessionMock).not.toHaveBeenCalled();
    expect(revokeSessionMock).toHaveBeenCalledWith({ sessionKey: sessionKey });
  });

  describe("localStorage persistence", () => {
    it("persists the session and connection keys after a successful login", async () => {
      const manager = createLoginManager({ os });
      const loginPromise = manager.login();

      const request = await manager.requestLoginByEmail(EMAIL);
      if (!request.success)
        throw new Error("expected login request to succeed");
      await manager.submitLoginCode("123456", request);
      await loginPromise;

      await waitFor(() => localStorage.getItem("sessionKey") === SESSION_KEY);
      expect(localStorage.getItem("sessionKey")).toBe(SESSION_KEY);
      expect(localStorage.getItem("connectionKey")).toBe("connection-key-1");
    });

    it("persists new keys to localStorage when the signals change", async () => {
      createLoginManager({ os });

      os.sessionKey.value = REFRESHED_SESSION_KEY;
      os.connectionKey.value = "connection-key-2";

      await waitFor(
        () => localStorage.getItem("sessionKey") === REFRESHED_SESSION_KEY
      );
      expect(localStorage.getItem("sessionKey")).toBe(REFRESHED_SESSION_KEY);
      expect(localStorage.getItem("connectionKey")).toBe("connection-key-2");
    });

    it("clears the persisted keys on logout", async () => {
      const manager = createAuthenticatedManager();

      await waitFor(() => manager.userId.value === USER_ID);

      await manager.logout();

      expect(localStorage.getItem("sessionKey")).toBe(null);
      expect(localStorage.getItem("connectionKey")).toBe(null);
    });
  });

  describe("profile", () => {
    it("login() authenticates and loads the profile", async () => {
      getDataMock.mockResolvedValue({ success: true, data: { name: "Bob" } });

      const manager = createLoginManager({ os });
      const loginPromise = manager.login();

      const request = await manager.requestLoginByEmail(EMAIL);
      if (!request.success)
        throw new Error("expected login request to succeed");
      await manager.submitLoginCode("123456", request);
      await loginPromise;

      await waitFor(() => manager.userId.value === USER_ID);
      await waitFor(() => manager.profile.value?.name === "Bob");

      expect(getDataMock).toHaveBeenCalledWith(USER_ID, "profile");
    });

    it("logout() clears the user state", async () => {
      getDataMock.mockResolvedValue({ success: true, data: { name: "Carol" } });

      const manager = createAuthenticatedManager();

      await waitFor(() => manager.userId.value === USER_ID);
      await waitFor(() => manager.profile.value?.name === "Carol");

      await manager.logout();

      await waitFor(() => manager.userId.value === null);
      await waitFor(() => manager.profile.value === null);
    });

    it("updateProfile() persists the profile when authenticated", async () => {
      const manager = createAuthenticatedManager();

      await waitFor(() => manager.userId.value === USER_ID);
      // Let the initial profile load settle so it does not clobber our update.
      await waitFor(() => manager.profile.value !== null);

      manager.updateProfile({ name: "Updated" });

      expect(manager.profile.value).toEqual({ name: "Updated" });
      expect(recordDataMock).toHaveBeenCalledWith(
        USER_ID,
        "profile",
        { name: "Updated" },
        { marker: "publicRead" }
      );
    });

    it("updateProfile() does not persist when unauthenticated", () => {
      const manager = createLoginManager({ os });

      manager.updateProfile({ name: "Ignored" });

      expect(recordDataMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        "Cannot update profile: no authenticated user"
      );
    });

    it("getUserProfile() retrieves the user profile from storage", async () => {
      getDataMock.mockResolvedValue({ success: true, data: { name: "Dave" } });

      const manager = createLoginManager({ os });

      const profile = await manager.getUserProfile("custom-user");

      expect(getDataMock).toHaveBeenCalledWith("custom-user", "profile");
      expect(profile).toEqual({ name: "Dave" });
    });

    it("identifies the user with PostHog when the user logs in", async () => {
      const mockIdentify = vi.fn();
      const mockSetPersonProperties = vi.fn();
      (globalThis as any).posthog = {
        identify: mockIdentify,
        setPersonProperties: mockSetPersonProperties,
      };

      try {
        const manager = createLoginManager({ os });
        const loginPromise = manager.login();

        const request = await manager.requestLoginByEmail(EMAIL);
        if (!request.success) {
          throw new Error("expected login request to succeed");
        }
        await manager.submitLoginCode("123456", request);
        await loginPromise;

        await waitFor(() => manager.userId.value === USER_ID);

        expect(mockIdentify).toHaveBeenCalledWith(USER_ID);
        expect(mockSetPersonProperties).toHaveBeenCalledWith({ email: EMAIL });
      } finally {
        delete (globalThis as any).posthog;
      }
    });
  });

  describe("uploadProfilePicture()", () => {
    let recordFileMock: Mock;

    beforeEach(() => {
      recordFileMock = vi.spyOn(os, "recordFile") as unknown as Mock;
    });

    /** A real File, matching what the profile picture modal hands the manager. */
    function makeFile(): File {
      return new File([new Uint8Array([1, 2, 3])], "avatar.png", {
        type: "image/png",
      });
    }

    it("does nothing when no user is authenticated", async () => {
      const manager = createLoginManager({ os });

      await manager.uploadProfilePicture(makeFile());

      expect(recordFileMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        "Cannot upload profile picture: no authenticated user"
      );
    });

    it("uploads the file and saves the URL to the profile on success", async () => {
      const file = makeFile();
      recordFileMock.mockResolvedValue({
        success: true,
        url: "https://example.com/avatar.png",
      });

      const manager = createAuthenticatedManager();
      await waitFor(() => manager.userId.value === USER_ID);

      await manager.uploadProfilePicture(file);

      expect(recordFileMock).toHaveBeenCalledWith(USER_ID, file, {
        mimeType: "image/png",
        marker: "publicRead",
      });
      expect(manager.profile.value?.pictureUrl).toBe(
        "https://example.com/avatar.png"
      );
    });

    it("throws an error and does not update the profile when the upload fails", async () => {
      recordFileMock.mockResolvedValue({
        success: false,
        errorCode: "upload_failed",
        errorMessage: "Upload failed.",
      });

      const manager = createAuthenticatedManager();
      await waitFor(() => manager.userId.value === USER_ID);

      await expect(manager.uploadProfilePicture(makeFile())).rejects.toThrow(
        "Failed to upload profile picture"
      );

      expect(manager.profile.value?.pictureUrl).toBeUndefined();
    });
  });
});

describe("userProfileSchema", () => {
  it("validates a profile with only a name", () => {
    const validProfile = {
      name: "Alice",
    };

    const result = userProfileSchema.safeParse(validProfile);
    expect(result).toEqual({
      success: true,
      data: {
        name: "Alice",
      },
    });
  });

  it("validates a profile without a pictureUrl", () => {
    const validProfile = {
      name: "Alice",
      location: "Wonderland",
    };

    const result = userProfileSchema.safeParse(validProfile);
    expect(result).toEqual({
      success: true,
      data: {
        name: "Alice",
        location: "Wonderland",
      },
    });
  });

  it("validates a complete profile", () => {
    const validProfile = {
      name: "Alice",
      location: "Wonderland",
      pictureUrl: "https://example.com/avatar.png",
    };

    const result = userProfileSchema.safeParse(validProfile);
    expect(result).toEqual({
      success: true,
      data: {
        name: "Alice",
        location: "Wonderland",
        pictureUrl: "https://example.com/avatar.png",
      },
    });
  });
});
