import {
  FATAL_SESSION_ERROR_CODES,
  guardRecordsClient,
  type FatalSessionErrorCode,
} from "@packages/seed-bible/seed-bible/managers/SessionGuard";

const SESSION_KEY = "session-key-1";

/**
 * Builds a guard over a fake client, along with handles for driving it: the current
 * session key is a plain `let` so a test can change it mid-flight, and
 * `onSessionInvalidated` is recorded rather than acted on.
 */
function createGuard(
  target: Record<string, unknown>,
  initialSessionKey: string | null = SESSION_KEY
) {
  let sessionKey = initialSessionKey;
  const invalidated: FatalSessionErrorCode[] = [];

  const wrapped = guardRecordsClient(target, {
    getSessionKey: () => sessionKey,
    onSessionInvalidated: (errorCode) => invalidated.push(errorCode),
  });

  return {
    wrapped,
    invalidated,
    setSessionKey: (key: string | null) => {
      sessionKey = key;
    },
  };
}

function failure(errorCode: string) {
  return { success: false, errorCode, errorMessage: `${errorCode} happened` };
}

describe("guardRecordsClient", () => {
  describe("transparency", () => {
    it("forwards arguments and results through to the wrapped client", async () => {
      const getData = vi.fn().mockResolvedValue({ success: true, data: 42 });
      const { wrapped } = createGuard({ getData });

      const result = await (
        wrapped as { getData: (arg: unknown) => Promise<unknown> }
      ).getData({ recordName: "r", address: "a" });

      expect(getData).toHaveBeenCalledWith({ recordName: "r", address: "a" });
      expect(result).toEqual({ success: true, data: 42 });
    });

    it("calls methods with the wrapped client as `this`", async () => {
      const target = {
        sessionKey: null as string | null,
        whoAmI(this: { sessionKey: string | null }) {
          return Promise.resolve({ success: true, key: this.sessionKey });
        },
      };
      const { wrapped } = createGuard(
        target as unknown as Record<string, unknown>
      );

      (wrapped as unknown as { sessionKey: string }).sessionKey = "abc";
      const result = await (
        wrapped as unknown as { whoAmI: () => Promise<{ key: string }> }
      ).whoAmI();

      expect(result.key).toBe("abc");
    });

    it("reads and writes plain properties through the wrapper", () => {
      const target: Record<string, unknown> = { sessionKey: null };
      const { wrapped } = createGuard(target);

      (wrapped as { sessionKey: string }).sessionKey = "written";

      expect(target.sessionKey).toBe("written");
      expect((wrapped as { sessionKey: string }).sessionKey).toBe("written");
    });

    it("leaves an undefined `then` undefined so the client is not treated as a promise", () => {
      // The SDK pins `then`/`catch` to undefined on purpose so its client isn't
      // mistaken for a thenable. Wrapping every property in a function would undo
      // that and make `await client` hang.
      const { wrapped } = createGuard({ then: undefined, catch: undefined });

      expect((wrapped as { then?: unknown }).then).toBeUndefined();
      expect((wrapped as { catch?: unknown }).catch).toBeUndefined();
    });

    it("returns non-promise results untouched", () => {
      const { wrapped } = createGuard({ addOne: (n: number) => n + 1 });

      expect((wrapped as { addOne: (n: number) => number }).addOne(1)).toBe(2);
    });

    it("passes symbol property access through unwrapped", () => {
      const iterator = function* () {
        yield 1;
      };
      const { wrapped } = createGuard({ [Symbol.iterator]: iterator });

      expect(
        (wrapped as unknown as Record<symbol, unknown>)[Symbol.iterator]
      ).toBe(iterator);
    });
  });

  describe("detecting a dead session", () => {
    it.each(FATAL_SESSION_ERROR_CODES)(
      "reports a dead session when a call fails with %s",
      async (errorCode) => {
        const call = vi.fn().mockResolvedValue(failure(errorCode));
        const { wrapped, invalidated } = createGuard({ call });

        await (wrapped as { call: () => Promise<unknown> }).call();

        expect(invalidated).toEqual([errorCode]);
      }
    );

    it("still hands the failure back to the caller unchanged", async () => {
      const expected = failure("session_expired");
      const call = vi.fn().mockResolvedValue(expected);
      const { wrapped } = createGuard({ call });

      await expect(
        (wrapped as { call: () => Promise<unknown> }).call()
      ).resolves.toBe(expected);
    });

    it.each([
      "server_error",
      "rate_limit_exceeded",
      "not_authorized",
      "not_logged_in",
      "data_not_found",
      "unacceptable_session_key",
    ])("does not report a dead session for %s", async (errorCode) => {
      const call = vi.fn().mockResolvedValue(failure(errorCode));
      const { wrapped, invalidated } = createGuard({ call });

      await (wrapped as { call: () => Promise<unknown> }).call();

      expect(invalidated).toEqual([]);
    });

    it("does not report a dead session on success", async () => {
      const call = vi.fn().mockResolvedValue({ success: true });
      const { wrapped, invalidated } = createGuard({ call });

      await (wrapped as { call: () => Promise<unknown> }).call();

      expect(invalidated).toEqual([]);
    });

    it("does not report a dead session when the call rejects", async () => {
      // A network failure must never sign anyone out — the session may be perfectly
      // fine and the user merely offline.
      const call = vi.fn().mockRejectedValue(new Error("offline"));
      const { wrapped, invalidated } = createGuard({ call });

      await expect(
        (wrapped as { call: () => Promise<unknown> }).call()
      ).rejects.toThrow("offline");
      expect(invalidated).toEqual([]);
    });

    it("ignores results that are not result objects", async () => {
      // Streaming procedures resolve to an async generator, not `{ success }`.
      async function* stream() {
        yield 1;
      }
      const call = vi.fn().mockResolvedValue(stream());
      const { wrapped, invalidated } = createGuard({ call });

      await (wrapped as { call: () => Promise<unknown> }).call();

      expect(invalidated).toEqual([]);
    });
  });

  describe("guards against signing out the wrong session", () => {
    it("does not report when no session key was attached to the request", async () => {
      const call = vi.fn().mockResolvedValue(failure("session_expired"));
      const { wrapped, invalidated } = createGuard({ call }, null);

      await (wrapped as { call: () => Promise<unknown> }).call();

      expect(invalidated).toEqual([]);
    });

    it("does not report when the session key changed while the request was in flight", async () => {
      const call = vi.fn().mockResolvedValue(failure("session_expired"));
      const { wrapped, invalidated, setSessionKey } = createGuard({ call });

      const pending = (wrapped as { call: () => Promise<unknown> }).call();
      setSessionKey("a-different-key");
      await pending;

      expect(invalidated).toEqual([]);
    });

    it("reports once when several requests fail at the same time", async () => {
      // Mimics what LoginManager does: the first report clears the session key, so
      // every later failure is measured against a key that no longer matches.
      let sessionKey: string | null = SESSION_KEY;
      const invalidated: FatalSessionErrorCode[] = [];
      const call = vi.fn().mockResolvedValue(failure("session_expired"));

      const wrapped = guardRecordsClient(
        { call },
        {
          getSessionKey: () => sessionKey,
          onSessionInvalidated: (errorCode) => {
            invalidated.push(errorCode);
            sessionKey = null;
          },
        }
      );

      await Promise.all([
        wrapped.call(),
        wrapped.call(),
        wrapped.call(),
        wrapped.call(),
      ]);

      expect(invalidated).toEqual(["session_expired"]);
    });

    it("does not report failures from revokeSession", async () => {
      // A deliberate sign-out revokes the key; that call coming back
      // `session_expired` is expected and must not be reported as a lost session.
      const revokeSession = vi
        .fn()
        .mockResolvedValue(failure("session_expired"));
      const { wrapped, invalidated } = createGuard({ revokeSession });

      await (
        wrapped as { revokeSession: () => Promise<unknown> }
      ).revokeSession();

      expect(invalidated).toEqual([]);
    });
  });
});
