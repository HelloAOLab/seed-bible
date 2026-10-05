import {
  OPEN_ID_CALLBACK_CHANNEL,
  YOUVERSION_AUTH_CALLBACK_URL,
  decideOpenIDCallbackStep,
  handleOpenIDCallback,
  isOpenIDCallbackPath,
  type OpenIDCallbackMessage,
} from "@packages/seed-bible/seed-bible/managers/OpenIDCallback";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { Mock } from "vitest";

/** Wait for a condition to become true, polling the macrotask queue. */
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
  let processOAuthCode: Mock;
  let navigate: Mock;
  let close: Mock;
  let listener: BroadcastChannel;
  let messages: OpenIDCallbackMessage[];

  beforeEach(() => {
    processOAuthCode = vi.fn().mockResolvedValue({ success: true });
    navigate = vi.fn();
    close = vi.fn();
    messages = [];
    listener = new BroadcastChannel(OPEN_ID_CALLBACK_CHANNEL);
    listener.onmessage = (event: MessageEvent) => {
      messages.push(event.data as OpenIDCallbackMessage);
    };
  });

  afterEach(() => {
    listener.close();
  });

  function run(search: string) {
    return handleOpenIDCallback({
      os: { client: { processOAuthCode } } as unknown as Pick<
        CasualOSManager,
        "client"
      >,
      search,
      navigate,
      close,
    });
  }

  it("sends the window on to YouVersion without touching the auth server", async () => {
    await run("?state=abc");

    expect(navigate).toHaveBeenCalledWith(
      `${YOUVERSION_AUTH_CALLBACK_URL}?state=abc`
    );
    expect(processOAuthCode).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it("hands the code to the auth server, reports back and closes", async () => {
    await run("?code=the-code&state=abc");

    expect(processOAuthCode).toHaveBeenCalledWith({
      code: "the-code",
      state: "abc",
    });
    await waitFor(() => messages.length > 0);
    expect(messages).toEqual([{ type: "processed" }]);
    expect(close).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("reports an auth server refusal and closes", async () => {
    processOAuthCode.mockResolvedValue({
      success: false,
      errorCode: "invalid_request",
      errorMessage: "The login request is invalid.",
    });

    await run("?code=the-code&state=abc");

    await waitFor(() => messages.length > 0);
    expect(messages).toEqual([
      {
        type: "failed",
        errorCode: "invalid_request",
        errorMessage: "The login request is invalid.",
      },
    ]);
    expect(close).toHaveBeenCalled();
  });

  it("reports an unreachable auth server and still closes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    processOAuthCode.mockRejectedValue(new TypeError("Failed to fetch"));

    await run("?code=the-code&state=abc");

    await waitFor(() => messages.length > 0);
    expect(messages[0]).toMatchObject({
      type: "failed",
      errorCode: "server_error",
    });
    expect(close).toHaveBeenCalled();
  });

  it("just closes when the user declined on YouVersion", async () => {
    await run("?error=access_denied&state=abc");

    expect(close).toHaveBeenCalled();
    expect(processOAuthCode).not.toHaveBeenCalled();
    // Give a stray message the chance to arrive before asserting there was none.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(messages).toEqual([]);
  });
});
