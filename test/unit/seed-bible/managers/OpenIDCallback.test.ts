import {
  YOUVERSION_AUTH_CALLBACK_URL,
  decideOpenIDCallbackStep,
  handleOpenIDCallback,
  isOpenIDCallbackPath,
  readPendingOpenIDLogin,
  writePendingOpenIDLogin,
  type PendingOpenIDLogin,
} from "@packages/seed-bible/seed-bible/managers/OpenIDCallback";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { Mock } from "vitest";

describe("isOpenIDCallbackPath", () => {
  it("matches the path the provider redirects back to", () => {
    expect(isOpenIDCallbackPath("", "/oauth/redirect")).toBe(true);
    expect(isOpenIDCallbackPath("", "/oauth/redirect/")).toBe(true);
  });

  it("matches only under this deployment's base path", () => {
    const basePath = "/b/my-branch/abc123";
    expect(isOpenIDCallbackPath(basePath, `${basePath}/oauth/redirect`)).toBe(
      true
    );
    expect(isOpenIDCallbackPath(basePath, "/oauth/redirect")).toBe(false);
  });

  it("leaves every other page to the app", () => {
    expect(isOpenIDCallbackPath("", "/")).toBe(false);
    expect(isOpenIDCallbackPath("", "/en/genesis/1")).toBe(false);
    expect(isOpenIDCallbackPath("", "/oauth/redirect/extra")).toBe(false);
  });
});

describe("decideOpenIDCallbackStep", () => {
  it("forwards a state-only redirect to YouVersion with every parameter", () => {
    const step = decideOpenIDCallbackStep(
      "?state=abc&granted_permissions=highlights"
    );

    expect(step.type).toBe("forward");
    if (step.type !== "forward") return;
    const url = new URL(step.url);
    expect(`${url.origin}${url.pathname}`).toBe(YOUVERSION_AUTH_CALLBACK_URL);
    expect(url.searchParams.get("state")).toBe("abc");
    expect(url.searchParams.get("granted_permissions")).toBe("highlights");
  });

  it("processes the redirect that carries the code", () => {
    expect(decideOpenIDCallbackStep("?code=the-code&state=abc")).toEqual({
      type: "process",
      code: "the-code",
      state: "abc",
    });
  });

  it("treats a provider error as the user backing out", () => {
    expect(decideOpenIDCallbackStep("?error=access_denied&state=abc")).toEqual({
      type: "denied",
      error: "access_denied",
    });
  });

  it("rejects a callback with no state", () => {
    expect(decideOpenIDCallbackStep("?code=the-code")).toEqual({
      type: "invalid",
    });
    expect(decideOpenIDCallbackStep("")).toEqual({ type: "invalid" });
  });
});

describe("handleOpenIDCallback", () => {
  const RETURN_URL = "/en/BSB/john/3?today=closed";

  let processOAuthCode: Mock;
  let navigate: Mock;

  beforeEach(() => {
    localStorage.clear();
    processOAuthCode = vi.fn().mockResolvedValue({ success: true });
    navigate = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function savePending(overrides: Partial<PendingOpenIDLogin> = {}) {
    writePendingOpenIDLogin(localStorage, {
      requestId: "oid-request-1",
      returnUrl: RETURN_URL,
      expireTimeMs: Date.now() + 60_000,
      ...overrides,
    });
  }

  function run(search: string) {
    return handleOpenIDCallback({
      os: { client: { processOAuthCode } } as unknown as Pick<
        CasualOSManager,
        "client"
      >,
      search,
      storage: localStorage,
      navigate,
      fallbackUrl: "/",
    });
  }

  it("sends the tab on to YouVersion without touching the auth server", async () => {
    savePending();

    await run("?state=abc");

    expect(navigate).toHaveBeenCalledWith(
      `${YOUVERSION_AUTH_CALLBACK_URL}?state=abc`
    );
    expect(processOAuthCode).not.toHaveBeenCalled();
    // Still needed for the trip back.
    expect(readPendingOpenIDLogin(localStorage)).toMatchObject({
      requestId: "oid-request-1",
    });
  });

  it("hands the code to the auth server and returns to the starting page", async () => {
    savePending();

    await run("?code=the-code&state=abc");

    expect(processOAuthCode).toHaveBeenCalledWith({
      code: "the-code",
      state: "abc",
    });
    expect(readPendingOpenIDLogin(localStorage)).toMatchObject({
      requestId: "oid-request-1",
      codeProcessed: true,
    });
    expect(navigate).toHaveBeenCalledWith(RETURN_URL);
  });

  it("saves an auth server refusal for the app to report", async () => {
    savePending();
    processOAuthCode.mockResolvedValue({
      success: false,
      errorCode: "invalid_request",
      errorMessage: "The login request is invalid.",
    });

    await run("?code=the-code&state=abc");

    const pending = readPendingOpenIDLogin(localStorage);
    expect(pending?.codeProcessed).toBeUndefined();
    expect(pending?.error).toEqual({
      errorCode: "invalid_request",
      errorMessage: "The login request is invalid.",
    });
    expect(navigate).toHaveBeenCalledWith(RETURN_URL);
  });

  it("saves an unreachable auth server as a failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    savePending();
    processOAuthCode.mockRejectedValue(new TypeError("Failed to fetch"));

    await run("?code=the-code&state=abc");

    expect(readPendingOpenIDLogin(localStorage)?.error?.errorCode).toBe(
      "server_error"
    );
    expect(navigate).toHaveBeenCalledWith(RETURN_URL);
  });

  it("reports a lost login request instead of processing the code", async () => {
    await run("?code=the-code&state=abc");

    expect(processOAuthCode).not.toHaveBeenCalled();
    expect(readPendingOpenIDLogin(localStorage)).toMatchObject({
      requestId: null,
      error: { errorCode: "invalid_request" },
    });
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("forgets the login when the user declined on YouVersion", async () => {
    savePending();

    await run("?error=access_denied&state=abc");

    expect(processOAuthCode).not.toHaveBeenCalled();
    expect(readPendingOpenIDLogin(localStorage)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(RETURN_URL);
  });

  it("never returns to another site", async () => {
    savePending({ returnUrl: "//evil.example.com/" });

    await run("?code=the-code&state=abc");

    expect(navigate).toHaveBeenCalledWith("/");
  });
});
