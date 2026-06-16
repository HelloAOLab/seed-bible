import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { formatV1SessionKey } from "@casual-simulation/aux-common";
import type { Mock } from "vitest";

vi.setConfig({ testTimeout: 5000 });

// The RecordsClient is a Proxy that synthesizes a network call for every
// accessed method, so we replace the whole module with controllable mocks.
const { requestLoginMock, completeLoginMock, getUserInfoMock } = vi.hoisted(
  () => ({
    requestLoginMock: vi.fn(),
    completeLoginMock: vi.fn(),
    getUserInfoMock: vi.fn(),
  })
);

vi.mock("@casual-simulation/aux-records/RecordsClient", () => ({
  createRecordsClient: vi.fn(() => ({
    sessionKey: null as string | null,
    requestLogin: requestLoginMock,
    completeLogin: completeLoginMock,
    getUserInfo: getUserInfoMock,
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
  Date.now() + 1000 * 60 * 60
);

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

describe("CasualOSManager login", () => {
  let os: CasualOSManager;

  beforeEach(() => {
    localStorage.clear();

    requestLoginMock.mockReset();
    completeLoginMock.mockReset();
    getUserInfoMock.mockReset();

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

    os = CasualOSManager();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("requestAuthBot() opens the login UI and waits for user info before resolving", async () => {
    let resolvedInfo: unknown = "pending";
    const promise = os.requestAuthBot().then((info) => (resolvedInfo = info));

    // The login UI is opened immediately...
    expect(os.isLoginOpen.value).toBe(true);

    // ...and the promise does not resolve until the flow completes.
    await flush();
    expect(resolvedInfo).toBe("pending");
    expect(getUserInfoMock).not.toHaveBeenCalled();

    // Complete the flow.
    const request = await os.requestLoginByEmail(EMAIL);
    if (!request.success) throw new Error("expected login request to succeed");
    await os.submitEmailCode("123456", request);

    await promise;
    expect(resolvedInfo).toEqual({ id: USER_ID, email: EMAIL });
    // The UI is closed once login resolves.
    await waitFor(() => os.isLoginOpen.value === false);
  });

  it("requestAuthBot() called twice resolves with the same promise", async () => {
    const first = os.requestAuthBot();
    const second = os.requestAuthBot();

    expect(second).toBe(first);

    // Complete the flow so the shared promise settles cleanly.
    const request = await os.requestLoginByEmail(EMAIL);
    if (!request.success) throw new Error("expected login request to succeed");
    await os.submitEmailCode("123456", request);

    await expect(first).resolves.toEqual({ id: USER_ID, email: EMAIL });
    await expect(second).resolves.toEqual({ id: USER_ID, email: EMAIL });
  });

  it("requestAuthBotInBackground() does nothing when there is no session key", async () => {
    const result = await os.requestAuthBotInBackground();

    expect(result).toBeNull();
    expect(os.isLoginOpen.value).toBe(false);
    expect(requestLoginMock).not.toHaveBeenCalled();
    expect(getUserInfoMock).not.toHaveBeenCalled();
  });

  it("requestAuthBotInBackground() loads the user info when there is a session key", async () => {
    // There is no session persistence, so the only way to obtain a session key
    // is to complete a login. Make the first user-info load fail so the key is
    // stored without the user info being populated.
    getUserInfoMock.mockResolvedValueOnce({
      success: false,
      errorCode: "user_not_found",
      errorMessage: "User not found.",
    });

    const request = await os.requestLoginByEmail(EMAIL);
    if (!request.success) throw new Error("expected login request to succeed");
    await os.submitEmailCode("123456", request);

    expect(getUserInfoMock).toHaveBeenCalledTimes(1);

    // Now a session key exists but the user info is not loaded yet. The
    // background request should load it without opening the login UI.
    const result = await os.requestAuthBotInBackground();

    expect(os.isLoginOpen.value).toBe(false);
    expect(getUserInfoMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ id: USER_ID, email: EMAIL });
  });

  it("completes the login flow: requestAuthBot() -> requestLoginByEmail() -> submitEmailCode()", async () => {
    const loginPromise = os.requestAuthBot();

    const request = await os.requestLoginByEmail(EMAIL);
    expect(requestLoginMock).toHaveBeenCalledWith({
      address: EMAIL,
      addressType: "email",
      comId: "seed-bible",
    });
    if (!request.success) throw new Error("expected login request to succeed");

    const completeResult = await os.submitEmailCode("123456", request);
    expect(completeLoginMock).toHaveBeenCalledWith({
      code: "123456",
      requestId: "request-1",
      userId: USER_ID,
    });
    expect(completeResult.success).toBe(true);

    await expect(loginPromise).resolves.toEqual({ id: USER_ID, email: EMAIL });
    // The session key is propagated to the records client for authenticated calls.
    expect(os.client.sessionKey).toBe(SESSION_KEY);
  });

  it("can cancel the login flow", async () => {
    const loginPromise = os.requestAuthBot();
    expect(os.isLoginOpen.value).toBe(true);

    await os.cancelLogin();

    await expect(loginPromise).rejects.toThrow("Login cancelled");
    await waitFor(() => os.isLoginOpen.value === false);
    expect(getUserInfoMock).not.toHaveBeenCalled();
  });
});
