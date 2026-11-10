// @vitest-environment node
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  createNotificationsRelay,
  FRIEND_REQUEST_PUSH_PATH,
  FRIEND_REQUEST_PUSH_WINDOW_MS,
  MAX_BODY_BYTES,
  NOTIFICATIONS_CONFIG_PATH,
  parseSessionKey,
  readNotificationsConfig,
  serveNotificationsApi,
  type NotificationsRelay,
  type NotificationsRelayOptions,
  type RelayResponse,
} from "../../../server/notifications";

const ENDPOINT = "https://auth.example.test";
const SITE = "https://seedbible.example.test";
const NOTIFIER = "notifier-0000-4000-8000-000000000001";
const ADA = "ada-00000-4000-8000-00000000000a";
const BEN = "ben-00000-4000-8000-00000000000b";
const START = Date.UTC(2026, 10, 10, 12);

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
const sessionKey = (userId: string, expireTimeMs: number | null = null) =>
  `vSK1.${b64(userId)}.${b64(`session-${userId}`)}.${b64("secret")}.${b64(
    expireTimeMs === null ? "Infinity" : String(expireTimeMs)
  )}`;

const NOTIFIER_KEY = sessionKey(NOTIFIER);

interface SentRow {
  id: string;
  requestingUserId: string;
  targetUserId: string | null;
  permissions: unknown[];
  status: string;
  createdAtMs: number;
  expireTimeMs: number | null;
}

interface Call {
  procedure: string;
  input: Record<string, unknown>;
  headers: Record<string, string>;
}

type ProcedureResult = Record<string, unknown> & { success: boolean };

const FRIENDS = { marker: "friends", resourceKind: "data", action: "read" };

const fakeLog = () => ({
  info: vi.fn<(...args: unknown[]) => void>(),
  warn: vi.fn<(...args: unknown[]) => void>(),
  error: vi.fn<(...args: unknown[]) => void>(),
});

/**
 * Stands in for the CasualOS records server's HTTP API: one POST endpoint
 * taking `{procedure, input}`, answering as the user whose session key is in
 * the `Authorization` header.
 */
function fakeCasualOS(clock: { now: number }) {
  const sessions = new Set<string>([NOTIFIER_KEY]);
  const sent: SentRow[] = [];
  const profiles = new Map<string, unknown>();
  /** Recipients who turned push on, and whom they let send to their inbox. */
  const inboxes = new Map<string, Set<string>>();
  const pushes: { recordName: string; address: string; payload: unknown }[] =
    [];
  const calls: Call[] = [];
  const overrides = new Map<string, (input: Call) => ProcedureResult>();
  let pageSize = 50;
  let nextId = 1;

  const failure = (errorCode: string): ProcedureResult => ({
    success: false,
    errorCode,
    errorMessage: `secret upstream detail: ${errorCode}`,
  });

  const userFor = (headers: Record<string, string>) => {
    const key = headers.Authorization?.replace(/^Bearer /, "");
    return key && sessions.has(key) ? parseSessionKey(key)!.userId : null;
  };

  const procedures: Record<string, (call: Call) => ProcedureResult> = {
    listSentSharedPermissions: (call) => {
      const userId = userFor(call.headers);
      if (!userId) return failure("invalid_key");
      const mine = sent
        .filter((row) => row.requestingUserId === userId)
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      const page = Number(call.input.page ?? 0);
      return {
        success: true,
        sharedPermissions: mine.slice(page * pageSize, (page + 1) * pageSize),
        totalCount: mine.length,
      };
    },
    getData: (call) => {
      const profile = profiles.get(String(call.input.recordName));
      return profile === undefined
        ? failure("data_not_found")
        : { success: true, data: profile };
    },
    sendNotification: (call) => {
      const userId = userFor(call.headers);
      if (!userId) return failure("invalid_key");
      const allowed = inboxes.get(String(call.input.recordName));
      if (!allowed) return failure("data_not_found");
      if (!allowed.has(userId)) return failure("not_authorized");
      pushes.push({
        recordName: String(call.input.recordName),
        address: String(call.input.address),
        payload: call.input.payload,
      });
      return { success: true };
    },
  };

  const fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
    expect(String(url)).toBe(`${ENDPOINT}/api/v3/callProcedure`);
    expect(init?.method).toBe("POST");
    const { procedure, input } = JSON.parse(String(init?.body)) as {
      procedure: string;
      input: Record<string, unknown>;
    };
    const call: Call = {
      procedure,
      input,
      headers: init?.headers as Record<string, string>,
    };
    calls.push(call);
    const handler = overrides.get(procedure) ?? procedures[procedure];
    const result = handler ? handler(call) : failure("not_supported");
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "content-type": "application/json" },
    });
  });

  return {
    fetch: fetch as unknown as typeof globalThis.fetch,
    calls,
    pushes,
    profiles,
    overrides,
    failure,
    setPageSize: (size: number) => {
      pageSize = size;
    },
    /** A signed-in user, as the relay will see their key. */
    signIn: (userId: string) => {
      const key = sessionKey(userId, clock.now + 30 * 24 * 60 * 60 * 1000);
      sessions.add(key);
      return key;
    },
    /** `userId` turned push on, allowing the notifier to send to them. */
    turnOnPush: (userId: string, notifier = NOTIFIER) => {
      inboxes.set(userId, new Set([notifier]));
    },
    request: (
      from: string,
      to: string | null,
      overridesForRow: Partial<SentRow> = {}
    ): SentRow => {
      const row: SentRow = {
        id: `sp-${nextId++}`,
        requestingUserId: from,
        targetUserId: to,
        permissions: [FRIENDS],
        status: "requested",
        createdAtMs: clock.now - 1000,
        expireTimeMs: clock.now + 7 * 24 * 60 * 60 * 1000,
        ...overridesForRow,
      };
      sent.push(row);
      return row;
    },
  };
}

describe("parseSessionKey", () => {
  it("reads the user id and expiry from a CasualOS session key", () => {
    expect(parseSessionKey(sessionKey(ADA, 1234))).toEqual({
      userId: ADA,
      expireTimeMs: 1234,
    });
    expect(parseSessionKey(sessionKey(ADA))).toEqual({
      userId: ADA,
      expireTimeMs: null,
    });
  });

  it("refuses anything that isn't one", () => {
    expect(parseSessionKey("")).toBeNull();
    expect(parseSessionKey("not-a-key")).toBeNull();
    expect(parseSessionKey(`vSK2.${b64(ADA)}.a.b.c`)).toBeNull();
    expect(parseSessionKey(`vSK1.${b64(ADA)}.a.b`)).toBeNull();
    expect(parseSessionKey(`vSK1.${b64(ADA)}.a.b.${b64("soon")}`)).toBeNull();
  });
});

describe("readNotificationsConfig", () => {
  it("is off with the CasualOS and site defaults when nothing is set", () => {
    expect(readNotificationsConfig({})).toEqual({
      notifierSessionKey: null,
      casualosEndpoint: "https://auth.seedbible.org",
      siteOrigin: "https://seedbible.org",
    });
  });

  it("reads the notifier key, endpoint and site origin", () => {
    expect(
      readNotificationsConfig({
        NOTIFIER_SESSION_KEY: ` ${NOTIFIER_KEY} `,
        CASUALOS_AUTH_ENDPOINT: "https://auth.example.test/",
        NOTIFICATIONS_SITE_ORIGIN: "https://seedbible.example.test/some/path",
      })
    ).toEqual({
      notifierSessionKey: NOTIFIER_KEY,
      casualosEndpoint: "https://auth.example.test",
      siteOrigin: "https://seedbible.example.test",
    });
  });

  it("turns the relay off, loudly, when a setting can't be used", () => {
    const log = { error: vi.fn() };
    expect(
      readNotificationsConfig({ NOTIFIER_SESSION_KEY: "nonsense" }, log)
        .notifierSessionKey
    ).toBeNull();
    expect(
      readNotificationsConfig(
        {
          NOTIFIER_SESSION_KEY: NOTIFIER_KEY,
          NOTIFICATIONS_SITE_ORIGIN: "not a url",
        },
        log
      ).notifierSessionKey
    ).toBeNull();
    expect(log.error).toHaveBeenCalledTimes(2);
  });
});

describe("notifications relay", () => {
  let clock: { now: number };
  let casualos: ReturnType<typeof fakeCasualOS>;
  let log: ReturnType<typeof fakeLog>;
  let adaKey: string;

  beforeEach(() => {
    clock = { now: START };
    casualos = fakeCasualOS(clock);
    log = fakeLog();
    adaKey = casualos.signIn(ADA);
    casualos.profiles.set(ADA, { name: "Ada" });
    casualos.turnOnPush(BEN);
  });

  const relay = (
    overrides: Partial<NotificationsRelayOptions> = {}
  ): NotificationsRelay =>
    createNotificationsRelay({
      config: {
        notifierSessionKey: NOTIFIER_KEY,
        casualosEndpoint: ENDPOINT,
        siteOrigin: SITE,
      },
      fetch: casualos.fetch,
      now: () => clock.now,
      log,
      ...overrides,
    });

  const push = (
    target: NotificationsRelay,
    body: unknown,
    /** Null sends no `Authorization` header at all. */
    authorization: string | null = `Bearer ${adaKey}`
  ): Promise<RelayResponse> =>
    target.handle({
      method: "POST",
      pathname: FRIEND_REQUEST_PUSH_PATH,
      authorization: authorization ?? undefined,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  describe("GET /api/notifications/config", () => {
    const getConfig = (target: NotificationsRelay) =>
      target.handle({
        method: "GET",
        pathname: NOTIFICATIONS_CONFIG_PATH,
        authorization: undefined,
        body: null,
      });

    it("names the notifier and the inbox when the relay is on", async () => {
      await expect(getConfig(relay())).resolves.toEqual({
        status: 200,
        body: { push: { notifierUserId: NOTIFIER, inboxAddress: "inbox" } },
      });
    });

    it("says push is off when there's no notifier", async () => {
      const off = relay({
        config: {
          notifierSessionKey: null,
          casualosEndpoint: ENDPOINT,
          siteOrigin: SITE,
        },
      });
      await expect(getConfig(off)).resolves.toMatchObject({
        status: 200,
        body: { push: null },
      });
    });

    it("says push is off once the notifier's session has expired", async () => {
      const expiring = relay({
        config: {
          notifierSessionKey: sessionKey(NOTIFIER, START + 1000),
          casualosEndpoint: ENDPOINT,
          siteOrigin: SITE,
        },
      });
      await expect(getConfig(expiring)).resolves.toMatchObject({
        body: { push: { notifierUserId: NOTIFIER } },
      });

      clock.now = START + 1000;

      await expect(getConfig(expiring)).resolves.toMatchObject({
        body: { push: null },
      });
      await expect(push(expiring, { requestId: "sp-1" })).resolves.toEqual({
        status: 503,
        body: { error: "push_relay_off" },
      });
    });

    it("only answers GET", async () => {
      await expect(
        relay().handle({
          method: "POST",
          pathname: NOTIFICATIONS_CONFIG_PATH,
          authorization: undefined,
          body: "{}",
        })
      ).resolves.toMatchObject({ status: 405, headers: { allow: "GET" } });
    });
  });

  describe("POST /api/notifications/friend-request", () => {
    it("pushes the request to the recipient's inbox as the notifier", async () => {
      const request = casualos.request(ADA, BEN);

      await expect(push(relay(), { requestId: request.id })).resolves.toEqual({
        status: 200,
        body: { sent: true },
      });

      expect(casualos.pushes).toEqual([
        {
          recordName: BEN,
          address: "inbox",
          payload: {
            title: "New friend request",
            body: "Ada wants to be your friend on Seed Bible.",
            icon: "https://favicon.ao.bot/pwa/pwa-192x192.png",
            tag: "friend-request",
            timestamp: START,
            action: { type: "open_url", url: `${SITE}/?notifications=open` },
          },
        },
      ]);
      const send = casualos.calls.find(
        (c) => c.procedure === "sendNotification"
      )!;
      expect(send.headers.Authorization).toBe(`Bearer ${NOTIFIER_KEY}`);
      // A `topic` CasualOS can't pass on makes the push vanish silently.
      expect(send.input).not.toHaveProperty("topic");
    });

    it("asks CasualOS as the sender, and sends the site's Origin on every call", async () => {
      const request = casualos.request(ADA, BEN);

      await push(relay(), { requestId: request.id });

      const listing = casualos.calls.find(
        (c) => c.procedure === "listSentSharedPermissions"
      )!;
      expect(listing.headers.Authorization).toBe(`Bearer ${adaKey}`);
      // The profile is public: read without anyone's session.
      const profile = casualos.calls.find((c) => c.procedure === "getData")!;
      expect(profile.input).toEqual({ recordName: ADA, address: "profile" });
      expect(profile.headers.Authorization).toBeUndefined();
      expect(casualos.calls.map((c) => c.headers.Origin)).toEqual(
        casualos.calls.map(() => SITE)
      );
    });

    it("finds a request past the first page of what the sender has sent", async () => {
      casualos.setPageSize(2);
      const request = casualos.request(ADA, BEN, {
        createdAtMs: START - 60_000,
      });
      casualos.request(ADA, "someone-else-1");
      casualos.request(ADA, "someone-else-2");

      await expect(
        push(relay(), { requestId: request.id })
      ).resolves.toMatchObject({ status: 200, body: { sent: true } });
      expect(
        casualos.calls
          .filter((c) => c.procedure === "listSentSharedPermissions")
          .map((c) => c.input.page)
      ).toEqual([0, 1]);
    });

    it("says so when the recipient never turned push on", async () => {
      const request = casualos.request(ADA, "no-push-user");

      await expect(push(relay(), { requestId: request.id })).resolves.toEqual({
        status: 200,
        body: { sent: false, reason: "recipient_not_subscribed" },
      });
      expect(casualos.pushes).toEqual([]);
    });

    it("says so when the recipient's inbox doesn't let the notifier send", async () => {
      casualos.turnOnPush(BEN, "some-other-notifier");
      const request = casualos.request(ADA, BEN);

      await expect(push(relay(), { requestId: request.id })).resolves.toEqual({
        status: 200,
        body: { sent: false, reason: "recipient_not_subscribed" },
      });
    });

    describe("the sender's name", () => {
      const pushedBody = async (profile: unknown) => {
        if (profile === undefined) {
          casualos.profiles.delete(ADA);
        } else {
          casualos.profiles.set(ADA, profile);
        }
        const request = casualos.request(ADA, BEN);
        await push(relay(), { requestId: request.id });
        return (casualos.pushes[0]?.payload as { body: string }).body;
      };

      it("is 'Someone' when they have no profile", async () => {
        await expect(pushedBody(undefined)).resolves.toBe(
          "Someone wants to be your friend on Seed Bible."
        );
      });

      it("is 'Someone' when their profile has no name", async () => {
        await expect(pushedBody({ name: "   " })).resolves.toBe(
          "Someone wants to be your friend on Seed Bible."
        );
      });

      it("is 'Someone' when the profile can't be read", async () => {
        casualos.overrides.set("getData", () =>
          casualos.failure("server_error")
        );
        const request = casualos.request(ADA, BEN);
        await push(relay(), { requestId: request.id });
        expect((casualos.pushes[0]?.payload as { body: string }).body).toBe(
          "Someone wants to be your friend on Seed Bible."
        );
      });

      it("is kept to one short line", async () => {
        const body = await pushedBody({
          name: `  Ada\n\tLovelace${"e".repeat(100)}  `,
        });
        expect(body).toMatch(/^Ada Lovelacee+… wants to be your friend/);
        expect(body.split(" wants")[0]!.length).toBeLessThanOrEqual(60);
      });
    });

    it("is refused when the relay is off", async () => {
      const off = relay({
        config: {
          notifierSessionKey: null,
          casualosEndpoint: ENDPOINT,
          siteOrigin: SITE,
        },
      });
      await expect(push(off, { requestId: "sp-1" })).resolves.toEqual({
        status: 503,
        body: { error: "push_relay_off" },
      });
      expect(casualos.calls).toEqual([]);
    });

    it.each([
      ["no body", null],
      ["a body that isn't JSON", "requestId=sp-1"],
      ["no request id", {}],
      ["a request id that isn't a string", { requestId: 12 }],
      ["an empty request id", { requestId: "" }],
      ["a very long request id", { requestId: "x".repeat(201) }],
    ])("rejects %s", async (_label, body) => {
      const response = await relay().handle({
        method: "POST",
        pathname: FRIEND_REQUEST_PUSH_PATH,
        authorization: `Bearer ${adaKey}`,
        body:
          body === null
            ? null
            : typeof body === "string"
              ? body
              : JSON.stringify(body),
      });
      expect(response).toEqual({
        status: 400,
        body: { error: "invalid_request" },
      });
      expect(casualos.calls).toEqual([]);
    });

    it.each([
      ["no Authorization header", null, "not_signed_in"],
      [
        "a header that isn't a bearer token",
        `Basic ${adaKey}`,
        "not_signed_in",
      ],
      ["a key that isn't a session key", "Bearer nonsense", "invalid_session"],
      [
        "a session key that has expired",
        `Bearer ${sessionKey(ADA, START - 1)}`,
        "invalid_session",
      ],
    ])("rejects %s without asking CasualOS", async (_label, auth, error) => {
      const request = casualos.request(ADA, BEN);
      await expect(
        push(relay(), { requestId: request.id }, auth)
      ).resolves.toEqual({ status: 401, body: { error } });
      expect(casualos.calls).toEqual([]);
    });

    it("rejects a key CasualOS doesn't accept", async () => {
      const forged = sessionKey(ADA, START + 60_000);
      const request = casualos.request(ADA, BEN);

      await expect(
        push(relay(), { requestId: request.id }, `Bearer ${forged}`)
      ).resolves.toEqual({ status: 401, body: { error: "invalid_session" } });
      expect(casualos.pushes).toEqual([]);
    });

    it("won't push a request the sender didn't send", async () => {
      const someoneElses = casualos.request(BEN, ADA);

      await expect(
        push(relay(), { requestId: someoneElses.id })
      ).resolves.toEqual({ status: 404, body: { error: "request_not_found" } });
      await expect(push(relay(), { requestId: "sp-999" })).resolves.toEqual({
        status: 404,
        body: { error: "request_not_found" },
      });
      expect(casualos.pushes).toEqual([]);
    });

    it.each([
      ["already answered", { status: "accepted" }, "request_not_pending"],
      ["withdrawn", { status: "revoked" }, "request_not_pending"],
      ["expired", { expireTimeMs: START - 1 }, "request_not_pending"],
      [
        "asking for something besides friendship",
        { permissions: [{ ...FRIENDS, marker: "private" }] },
        "not_a_friend_request",
      ],
      [
        "bundling something else with friendship",
        {
          permissions: [
            FRIENDS,
            { marker: "private", resourceKind: "data", action: "read" },
          ],
        },
        "not_a_friend_request",
      ],
      ["sent to nobody in particular", { targetUserId: null }, "no_recipient"],
      ["sent to themselves", { targetUserId: ADA }, "no_recipient"],
      [
        "made more than 15 minutes ago",
        { createdAtMs: START - FRIEND_REQUEST_PUSH_WINDOW_MS - 1 },
        "request_too_old",
      ],
    ])("won't push a request %s", async (_label, row, error) => {
      const request = casualos.request(ADA, BEN, row as Partial<SentRow>);

      await expect(push(relay(), { requestId: request.id })).resolves.toEqual({
        status: 409,
        body: { error },
      });
      expect(casualos.pushes).toEqual([]);
    });

    it("pushes each request once", async () => {
      const target = relay();
      const request = casualos.request(ADA, BEN);

      const [first, second] = await Promise.all([
        push(target, { requestId: request.id }),
        push(target, { requestId: request.id }),
      ]);
      const third = await push(target, { requestId: request.id });

      expect([first.status, second.status].sort()).toEqual([200, 409]);
      expect(third).toEqual({ status: 409, body: { error: "already_sent" } });
      expect(casualos.pushes).toHaveLength(1);
    });

    it("lets a request be pushed again after a send that failed on the way", async () => {
      const target = relay();
      const request = casualos.request(ADA, BEN);
      casualos.overrides.set("sendNotification", () =>
        casualos.failure("server_error")
      );

      await expect(push(target, { requestId: request.id })).resolves.toEqual({
        status: 502,
        body: { error: "upstream_error" },
      });

      casualos.overrides.delete("sendNotification");
      await expect(
        push(target, { requestId: request.id })
      ).resolves.toMatchObject({ status: 200, body: { sent: true } });
    });

    it("limits how many pushes one sender can trigger in an hour", async () => {
      const target = relay({ hourlyLimit: 3 });
      const requests = [1, 2, 3, 4].map((n) => {
        const recipient = `friend-${n}`;
        casualos.turnOnPush(recipient);
        return casualos.request(ADA, recipient);
      });

      for (const request of requests.slice(0, 3)) {
        await expect(
          push(target, { requestId: request.id })
        ).resolves.toMatchObject({ status: 200 });
      }
      const callsBefore = casualos.calls.length;
      const limited = await push(target, { requestId: requests[3]!.id });

      expect(limited).toMatchObject({
        status: 429,
        body: { error: "rate_limited" },
      });
      expect(Number(limited.headers?.["retry-after"])).toBeGreaterThan(0);
      // Over the limit, the relay doesn't even look the request up.
      expect(casualos.calls).toHaveLength(callsBefore);

      clock.now = START + 60 * 60 * 1000 + 1;
      requests[3]!.createdAtMs = clock.now - 1000;
      await expect(
        push(target, { requestId: requests[3]!.id })
      ).resolves.toMatchObject({ status: 200, body: { sent: true } });
    });

    it("counts lookups of requests that turn out not to exist", async () => {
      const target = relay({ hourlyLimit: 2 });
      await push(target, { requestId: "made-up-1" });
      await push(target, { requestId: "made-up-2" });

      await expect(
        push(target, { requestId: "made-up-3" })
      ).resolves.toMatchObject({ status: 429 });
    });

    it("doesn't count a forged key against the person it names", async () => {
      const target = relay({ hourlyLimit: 1 });
      const forged = `Bearer ${sessionKey(ADA, START + 60_000)}`;
      await push(target, { requestId: "sp-x" }, forged);
      await push(target, { requestId: "sp-y" }, forged);
      const request = casualos.request(ADA, BEN);

      await expect(
        push(target, { requestId: request.id })
      ).resolves.toMatchObject({ status: 200, body: { sent: true } });
    });

    it("limits how many pushes one recipient can get in an hour", async () => {
      const target = relay({ hourlyLimit: 2 });
      const senders = ["s1", "s2", "s3"].map((id) => ({
        key: casualos.signIn(id),
        request: casualos.request(id, BEN),
      }));

      const statuses: number[] = [];
      for (const { key, request } of senders) {
        statuses.push(
          (await push(target, { requestId: request.id }, `Bearer ${key}`))
            .status
        );
      }

      expect(statuses).toEqual([200, 200, 429]);
      expect(casualos.pushes).toHaveLength(2);
    });

    it("answers a failed lookup without passing on what CasualOS said", async () => {
      casualos.overrides.set("listSentSharedPermissions", () =>
        casualos.failure("server_error")
      );
      const request = casualos.request(ADA, BEN);

      const response = await push(relay(), { requestId: request.id });

      expect(response).toEqual({
        status: 502,
        body: { error: "upstream_error" },
      });
      expect(JSON.stringify(response)).not.toContain("secret upstream detail");
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining("server_error")
      );
    });

    it("logs, and says it failed, when CasualOS refuses the notifier", async () => {
      casualos.overrides.set("sendNotification", () =>
        casualos.failure("session_expired")
      );
      const request = casualos.request(ADA, BEN);

      const response = await push(relay(), { requestId: request.id });

      expect(response).toEqual({
        status: 502,
        body: { error: "upstream_error" },
      });
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining("NOTIFIER_SESSION_KEY")
      );
    });

    it("answers when CasualOS can't be reached at all", async () => {
      const unreachable = vi.fn(async () => {
        throw new TypeError("fetch failed");
      });
      const request = casualos.request(ADA, BEN);

      await expect(
        push(relay({ fetch: unreachable as unknown as typeof fetch }), {
          requestId: request.id,
        })
      ).resolves.toEqual({ status: 502, body: { error: "upstream_error" } });
    });

    it("answers when CasualOS sends something that isn't a result", async () => {
      const broken = vi.fn(
        async () => new Response("<html>bad gateway</html>", { status: 502 })
      );
      const request = casualos.request(ADA, BEN);

      await expect(
        push(relay({ fetch: broken as unknown as typeof fetch }), {
          requestId: request.id,
        })
      ).resolves.toEqual({ status: 502, body: { error: "upstream_error" } });
    });

    it("only answers POST", async () => {
      await expect(
        relay().handle({
          method: "GET",
          pathname: FRIEND_REQUEST_PUSH_PATH,
          authorization: undefined,
          body: null,
        })
      ).resolves.toMatchObject({ status: 405, headers: { allow: "POST" } });
    });
  });
});

describe("serveNotificationsApi", () => {
  let server: Server;
  let base: string;
  let fallthrough: string[];

  beforeEach(async () => {
    const clock = { now: Date.now() };
    const casualos = fakeCasualOS(clock);
    const relay = createNotificationsRelay({
      config: {
        notifierSessionKey: NOTIFIER_KEY,
        casualosEndpoint: ENDPOINT,
        siteOrigin: SITE,
      },
      fetch: casualos.fetch,
      log: fakeLog(),
    });
    fallthrough = [];
    server = createServer((req, res) => {
      const { pathname } = new URL(req.url ?? "/", "http://localhost");
      void serveNotificationsApi(relay, req, res, pathname).then((handled) => {
        if (!handled) {
          fallthrough.push(pathname);
          res.writeHead(200, { "content-type": "text/html" });
          res.end("<html>page</html>");
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("answers the config as uncached JSON", async () => {
    const response = await fetch(`${base}${NOTIFICATIONS_CONFIG_PATH}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      push: { notifierUserId: NOTIFIER, inboxAddress: "inbox" },
    });
  });

  it("reads a JSON body and passes on the Authorization header", async () => {
    const response = await fetch(`${base}${FRIEND_REQUEST_PUSH_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer nonsense",
      },
      body: JSON.stringify({ requestId: "sp-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_session",
    });
  });

  it("refuses a body over the size limit", async () => {
    const response = await fetch(`${base}${FRIEND_REQUEST_PUSH_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "x".repeat(MAX_BODY_BYTES) }),
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "body_too_large",
    });
  });

  it("leaves every other path to the rest of the server", async () => {
    const response = await fetch(`${base}/api/notifications/other`);

    expect(await response.text()).toBe("<html>page</html>");
    expect(fallthrough).toEqual(["/api/notifications/other"]);
  });
});
