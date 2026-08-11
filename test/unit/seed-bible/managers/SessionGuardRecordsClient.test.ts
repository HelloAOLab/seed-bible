import { createRecordsClient } from "@casual-simulation/aux-records/RecordsClient";
import {
  guardRecordsClient,
  type FatalSessionErrorCode,
} from "@packages/seed-bible/seed-bible/managers/SessionGuard";

/**
 * `SessionGuard.test.ts` covers the guard's logic against a plain fake object. These
 * tests instead run it against the **real** CasualOS records client, because that
 * client is itself a Proxy that synthesizes a network call for any unrecognised
 * property — the trickiest thing the guard has to sit in front of. If a future SDK
 * upgrade changes that behaviour (freezing the client, switching to `#private`
 * fields, and so on), these are the tests that notice.
 */
describe("guardRecordsClient over the real records client", () => {
  const ENDPOINT = "https://example.invalid";
  const DEAD_SESSION_RESPONSE = {
    success: false,
    errorCode: "session_expired",
    errorMessage: "gone",
  };

  function createGuardedClient() {
    const rawClient = createRecordsClient(ENDPOINT);
    const invalidated: FatalSessionErrorCode[] = [];
    const client = guardRecordsClient(rawClient, {
      getSessionKey: () => "a-session-key",
      onSessionInvalidated: (errorCode) => invalidated.push(errorCode),
    });
    return { rawClient, client, invalidated };
  }

  /** Answers every request with `body`, mimicking a JSON response from the server. */
  function stubFetchWith(body: unknown) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        headers: { get: () => "application/json" },
        json: async () => body,
      })
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes sessionKey through to the underlying client", () => {
    // OsManager's effect and LoginManager both assign this directly, so the wrapper
    // has to forward the write rather than swallow it.
    const { rawClient, client } = createGuardedClient();

    client.sessionKey = "written-through";

    expect(client.sessionKey).toBe("written-through");
    expect(rawClient.sessionKey).toBe("written-through");
  });

  it("keeps the client from being mistaken for a promise", async () => {
    // The SDK pins `then`/`catch` to undefined for this reason. If the wrapper turned
    // them into functions, awaiting the client anywhere would hang forever.
    const { client } = createGuardedClient();

    expect(typeof (client as { then?: unknown }).then).not.toBe("function");
    await expect(Promise.resolve(client)).resolves.toBeDefined();
  });

  it("leaves plain getters readable", () => {
    const { client } = createGuardedClient();

    expect(client.endpoint).toBe(ENDPOINT);
  });

  it("detects a dead session on a synthesized procedure call", async () => {
    // `getData` is not a declared method — the SDK's Proxy invents it — so this is
    // the path every records call in the app actually takes.
    const { client, invalidated } = createGuardedClient();
    stubFetchWith(DEAD_SESSION_RESPONSE);

    const result = await client.getData({ recordName: "r", address: "a" });

    expect(result).toEqual(DEAD_SESSION_RESPONSE);
    expect(invalidated).toEqual(["session_expired"]);
  });

  it("supports callProcedure called directly", async () => {
    // A real prototype method rather than a synthesized one, so this is what proves
    // the wrapper passes a usable `this` through to the SDK instance.
    const { client, invalidated } = createGuardedClient();
    stubFetchWith(DEAD_SESSION_RESPONSE);

    const result = await client.callProcedure("getData", {
      recordName: "r",
      address: "a",
    });

    expect(result).toEqual(DEAD_SESSION_RESPONSE);
    expect(invalidated).toEqual(["session_expired"]);
  });

  it("leaves a successful response alone", async () => {
    const { client, invalidated } = createGuardedClient();
    stubFetchWith({ success: true, data: { verse: 1 } });

    const result = await client.getData({ recordName: "r", address: "a" });

    expect(result).toEqual({ success: true, data: { verse: 1 } });
    expect(invalidated).toEqual([]);
  });
});
