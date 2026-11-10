import { signal, type Signal } from "@preact/signals";
import { createFriendsManager } from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import {
  applicationServerKeyBytes,
  createPushNotificationsManager,
  PUSH_DEVICE_STORAGE_KEY,
  type CreatePushNotificationsManagerOptions,
  type PushNotificationsManager,
} from "@packages/seed-bible/seed-bible/managers/PushNotificationsManager";
import { fakeSharedPermissions, ME } from "../testUtils/fakeSharedPermissions";
import { stubPageVisibility } from "../testUtils/pageVisibility";

const OTHER_USER = "bbbbbbbb-0000-4000-8000-00000000000b";
const NOTIFIER = "nnnnnnnn-0000-4000-8000-00000000000n";
const SESSION_KEY = "vSK1.session-key-of-the-signed-in-user";
const CASUALOS = "https://auth.seedbible.org/api/v3/callProcedure";
/** A real VAPID public key's shape: URL-safe base64 of a 65-byte P-256 point. */
const VAPID_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const DAY_MS = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 10, 12);

type Answer = Record<string, unknown> & { success: boolean };

interface FakeSubscription {
  endpoint: string;
  toJSON: () => PushSubscriptionJSON;
  unsubscribe: ReturnType<typeof vi.fn<() => Promise<boolean>>>;
}

/**
 * The browser's side of push: a service worker registration with a push
 * manager, the Notification permission, and the window's `navigator`.
 */
function fakeBrowser() {
  let nextEndpoint = 1;
  const browser = {
    /** False is `pnpm dev`: no worker is ever registered. */
    registered: true,
    hasPushApis: true,
    permission: "default" as NotificationPermission,
    /** What the permission prompt answers when asked. */
    answer: "granted" as NotificationPermission,
    subscription: null as FakeSubscription | null,
    /** Endpoints this browser has ended, oldest first. */
    ended: [] as string[],
    refuseUnsubscribe: false,
    subscribeError: null as Error | null,
    subscribeOptions: [] as PushSubscriptionOptionsInit[],
    container: new EventTarget(),
    requestPermission: vi.fn(async () => {
      if (browser.permission === "default") {
        browser.permission = browser.answer;
      }
      return browser.permission;
    }),
    /** A subscription this browser already has, e.g. from an earlier visit. */
    subscribed: (endpoint = `https://push.example/${nextEndpoint++}`) => {
      const subscription: FakeSubscription = {
        endpoint,
        toJSON: () => ({
          endpoint,
          expirationTime: null,
          keys: { p256dh: `p256dh-${endpoint}`, auth: `auth-${endpoint}` },
        }),
        unsubscribe: vi.fn(async () => {
          if (browser.refuseUnsubscribe) {
            return false;
          }
          if (browser.subscription === subscription) {
            browser.subscription = null;
          }
          browser.ended.push(endpoint);
          return true;
        }),
      };
      browser.subscription = subscription;
      return subscription;
    },
  };

  const pushManager = {
    getSubscription: vi.fn(async () => browser.subscription),
    subscribe: vi.fn(async (options: PushSubscriptionOptionsInit) => {
      browser.subscribeOptions.push(options);
      if (browser.subscribeError) {
        throw browser.subscribeError;
      }
      if (browser.permission !== "granted") {
        throw new DOMException("Permission denied", "NotAllowedError");
      }
      return browser.subscribed();
    }),
  };
  const registration = { pushManager };

  Object.assign(browser.container, {
    getRegistration: vi.fn(async () =>
      browser.registered ? registration : undefined
    ),
    ready: new Promise(() => {}),
    startMessages: vi.fn(),
  });

  const install = () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: browser.container,
      configurable: true,
    });
    if (browser.hasPushApis) {
      vi.stubGlobal("PushManager", class {});
      vi.stubGlobal("Notification", {
        get permission() {
          return browser.permission;
        },
        requestPermission: browser.requestPermission,
      });
    }
  };

  return { ...browser, state: browser, pushManager, install };
}

/**
 * The network the manager talks to: our own server's push relay, and the
 * CasualOS records API (one POST endpoint taking `{procedure, input}`).
 */
function fakeNetwork() {
  const calls: { procedure: string; input: Record<string, unknown> }[] = [];
  const relayPosts: { headers: Record<string, string>; body: unknown }[] = [];
  const answers: Record<string, (input: Record<string, unknown>) => Answer> = {
    getNotificationsApplicationServerKey: () => ({
      success: true,
      key: VAPID_KEY,
    }),
    recordNotification: () => ({
      success: true,
      recordName: ME,
      address: "inbox",
    }),
    subscribeToNotification: () => ({ success: true, subscriptionId: "s-1" }),
    grantPermission: () => ({ success: true }),
    registerPushSubscription: () => ({ success: true }),
  };
  const network = {
    calls,
    relayPosts,
    answers,
    config: {
      push: { notifierUserId: NOTIFIER, inboxAddress: "inbox" },
    } as unknown,
    /** Set to make reading the relay's config fail. */
    configFailure: null as "http" | "offline" | null,
    /** How many times the relay's config was asked for. */
    configReads: 0,
    relayAnswer: (): Response | Promise<Response> =>
      Response.json({ sent: true }),
    procedures: () => calls.map((c) => c.procedure),
  };

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/notifications/config") {
      network.configReads++;
      if (network.configFailure === "offline") {
        throw new TypeError("Failed to fetch");
      }
      return network.configFailure === "http"
        ? new Response("Bad gateway", { status: 502 })
        : Response.json(network.config);
    }
    if (url === "/api/notifications/friend-request") {
      expect(init?.method).toBe("POST");
      relayPosts.push({
        headers: init?.headers as Record<string, string>,
        body: JSON.parse(String(init?.body)),
      });
      return network.relayAnswer();
    }
    if (url === CASUALOS) {
      const { procedure, input: procedureInput } = JSON.parse(
        String(init?.body)
      ) as { procedure: string; input: Record<string, unknown> };
      calls.push({ procedure, input: procedureInput });
      const answer = answers[procedure]?.(procedureInput) ?? {
        success: false,
        errorCode: "not_supported",
      };
      return Response.json(answer);
    }
    throw new Error(`Unexpected request to ${url}`);
  });
  vi.stubGlobal("fetch", fetch);
  return network;
}

const storedDevice = () => {
  const raw = localStorage.getItem(PUSH_DEVICE_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
};

const storeDevice = (record: Record<string, unknown>) =>
  localStorage.setItem(PUSH_DEVICE_STORAGE_KEY, JSON.stringify(record));

describe("PushNotificationsManager", () => {
  let os: CasualOSManager;
  let userId: Signal<string | null>;
  let login: LoginManager;
  let browser: ReturnType<typeof fakeBrowser>;
  let network: ReturnType<typeof fakeNetwork>;
  let clock: number;
  const created: PushNotificationsManager[] = [];

  const create = (
    overrides: Partial<CreatePushNotificationsManagerOptions> = {}
  ) => {
    browser.install();
    const push = createPushNotificationsManager({
      os,
      login,
      now: () => clock,
      serviceWorkerTimeoutMs: 20,
      ...overrides,
    });
    created.push(push);
    return push;
  };

  /** Creates the manager and runs the after-first-render step. */
  const start = (
    overrides: Partial<CreatePushNotificationsManagerOptions> = {}
  ) => {
    const push = create(overrides);
    push.hydrate();
    return push;
  };

  const settled = async (push: PushNotificationsManager) => {
    await vi.waitFor(() => {
      expect(push.status.value).not.toBe("checking");
      expect(push.isBusy.value).toBe(false);
    });
    return push.status.value;
  };

  /** A device that turned push on for `owner` earlier. */
  const pushWasOnFor = (
    owner: string,
    overrides: Record<string, unknown> = {}
  ) => {
    browser.state.permission = "granted";
    const subscription = browser.subscribed();
    storeDevice({
      userId: owner,
      endpoint: subscription.endpoint,
      notifierUserId: NOTIFIER,
      registeredAtMs: clock - 60_000,
      ...overrides,
    });
    return subscription;
  };

  beforeEach(() => {
    localStorage.clear();
    clock = START;
    os = CasualOSManager();
    os.sessionKey.value = SESSION_KEY;
    userId = signal<string | null>(ME);
    login = {
      userId,
      login: vi.fn().mockResolvedValue(null),
      getPublicProfile: vi.fn(async () => ({ name: "Ada", pictureUrl: null })),
    } as unknown as LoginManager;
    browser = fakeBrowser();
    network = fakeNetwork();
  });

  afterEach(() => {
    for (const push of created.splice(0)) {
      push.dispose();
    }
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    for (const key of ["userAgent", "maxTouchPoints", "standalone"]) {
      delete (navigator as unknown as Record<string, unknown>)[key];
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("status", () => {
    it("is checking, and touches nothing, until hydrated", async () => {
      const push = create();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(push.status.value).toBe("checking");
      expect(network.calls).toEqual([]);
      expect(browser.pushManager.getSubscription).not.toHaveBeenCalled();
    });

    it("is unsupported in a browser without service workers", async () => {
      browser.install = () => {};
      const push = start();

      await expect(settled(push)).resolves.toBe("unsupported");
    });

    it("is unsupported where no service worker is ever registered, without waiting forever", async () => {
      browser.state.registered = false;
      const push = start();

      await expect(settled(push)).resolves.toBe("unsupported");
    });

    it("notices a worker that registers after it stopped waiting, as on a slow first visit", async () => {
      let workerReady!: () => void;
      Object.assign(browser.container, {
        ready: new Promise<void>((resolve) => {
          workerReady = resolve;
        }),
      });
      browser.state.registered = false;
      const push = start();
      await expect(settled(push)).resolves.toBe("unsupported");

      browser.state.registered = true;
      workerReady();

      await vi.waitFor(() => expect(push.status.value).toBe("off"));
    });

    it("is unsupported in a browser without the push APIs", async () => {
      browser.state.hasPushApis = false;
      const push = start();

      await expect(settled(push)).resolves.toBe("unsupported");
    });

    describe("on an iPhone or iPad", () => {
      const onAppleMobile = (userAgent: string, touchPoints = 5) => {
        Object.defineProperty(navigator, "userAgent", {
          value: userAgent,
          configurable: true,
        });
        Object.defineProperty(navigator, "maxTouchPoints", {
          value: touchPoints,
          configurable: true,
        });
      };

      it("asks for the Home Screen app in Safari, where push is hidden", async () => {
        onAppleMobile(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
        );
        browser.state.hasPushApis = false;
        const push = start();

        await expect(settled(push)).resolves.toBe("needs-install");
      });

      it("recognises an iPad that presents itself as a Mac", async () => {
        onAppleMobile(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
        );
        browser.state.hasPushApis = false;
        const push = start();

        await expect(settled(push)).resolves.toBe("needs-install");
      });

      it("offers push in the Home Screen app", async () => {
        onAppleMobile(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"
        );
        Object.defineProperty(navigator, "standalone", {
          value: true,
          configurable: true,
        });
        const push = start();

        await expect(settled(push)).resolves.toBe("off");
      });

      it("offers nothing when the server has no push relay", async () => {
        onAppleMobile(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"
        );
        browser.state.hasPushApis = false;
        network.config = { push: null };
        const push = start();

        await expect(settled(push)).resolves.toBe("unconfigured");
      });
    });

    it("is unconfigured when the server has no push relay", async () => {
      network.config = { push: null };
      const push = start();

      await expect(settled(push)).resolves.toBe("unconfigured");
    });

    describe("when the relay's config can't be read", () => {
      it.each(["http", "offline", "malformed"] as const)(
        "keeps checking, rather than say push is off on the server (%s)",
        async (failure) => {
          const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
          if (failure === "malformed") {
            network.config = { push: { notifierUserId: 5 } };
          } else {
            network.configFailure = failure;
          }
          const push = start();

          await vi.waitFor(() =>
            expect(warn).toHaveBeenCalledWith(
              "Could not read the push notification config:",
              expect.anything()
            )
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
          expect(push.status.value).toBe("checking");
        }
      );

      it("reads it again when the app comes back into view, and offers push once it can", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const page = stubPageVisibility();
        try {
          network.configFailure = "offline";
          const push = start();
          await vi.waitFor(() => expect(network.configReads).toBe(1));

          network.configFailure = null;
          clock += 30_000;
          page.leaveAndReturn();

          await vi.waitFor(() => expect(push.status.value).toBe("off"));
          expect(network.configReads).toBe(2);
        } finally {
          page.restore();
        }
      });

      it("reads it again at most every 30 seconds", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const page = stubPageVisibility();
        try {
          network.configFailure = "offline";
          const push = start();
          await vi.waitFor(() => expect(network.configReads).toBe(1));
          await new Promise((resolve) => setTimeout(resolve, 0));

          clock += 29_000;
          page.leaveAndReturn();
          await new Promise((resolve) => setTimeout(resolve, 0));
          expect(network.configReads).toBe(1);

          clock += 1_000;
          page.leaveAndReturn();
          await vi.waitFor(() => expect(network.configReads).toBe(2));
          expect(push.status.value).toBe("checking");
        } finally {
          page.restore();
        }
      });
    });

    it("is signed-out with nobody signed in", async () => {
      userId.value = null;
      const push = start();

      await expect(settled(push)).resolves.toBe("signed-out");
    });

    it("is denied when notifications are blocked for the site", async () => {
      browser.state.permission = "denied";
      const push = start();

      await expect(settled(push)).resolves.toBe("denied");
    });

    it("is off for a signed-in user who hasn't turned it on here", async () => {
      const push = start();

      await expect(settled(push)).resolves.toBe("off");
    });

    it("is on when this browser's subscription was set up for the signed-in user", async () => {
      pushWasOnFor(ME);
      const push = start();

      await expect(settled(push)).resolves.toBe("on");
      expect(browser.state.ended).toEqual([]);
    });

    it("is off once the browser has dropped the subscription", async () => {
      pushWasOnFor(ME);
      browser.state.subscription = null;
      const push = start();

      await expect(settled(push)).resolves.toBe("off");
      expect(storedDevice()).toBeNull();
    });

    it("notices blocked notifications on coming back to the app", async () => {
      const page = stubPageVisibility();
      try {
        pushWasOnFor(ME);
        const push = start();
        await expect(settled(push)).resolves.toBe("on");

        // Blocked in the browser's site settings, which also ends the
        // subscription.
        page.set("hidden");
        browser.state.permission = "denied";
        browser.state.subscription = null;
        page.set("visible");

        await vi.waitFor(() => expect(push.status.value).toBe("denied"));
        expect(storedDevice()).toBeNull();
      } finally {
        page.restore();
      }
    });
  });

  describe("enable()", () => {
    it("subscribes this browser and sets up a private inbox only the notifier can send to", async () => {
      const push = start();
      await settled(push);

      await push.enable();

      expect(push.status.value).toBe("on");
      expect(push.error.value).toBeNull();
      expect(browser.requestPermission).toHaveBeenCalledTimes(1);
      expect(browser.state.subscribeOptions).toEqual([
        {
          userVisibleOnly: true,
          applicationServerKey: applicationServerKeyBytes(VAPID_KEY),
        },
      ]);
      const endpoint = browser.state.subscription!.endpoint;
      expect(network.calls).toEqual([
        { procedure: "getNotificationsApplicationServerKey" },
        {
          procedure: "recordNotification",
          input: {
            recordName: ME,
            item: {
              address: "inbox",
              description: expect.any(String),
              markers: ["private"],
            },
          },
        },
        {
          procedure: "subscribeToNotification",
          input: {
            recordName: ME,
            address: "inbox",
            pushSubscription: {
              endpoint,
              expirationTime: null,
              keys: { p256dh: `p256dh-${endpoint}`, auth: `auth-${endpoint}` },
            },
          },
        },
        {
          procedure: "grantPermission",
          input: {
            recordName: ME,
            permission: {
              subjectType: "user",
              subjectId: NOTIFIER,
              resourceKind: "notification",
              resourceId: "inbox",
              action: "send",
              expireTimeMs: null,
            },
          },
        },
      ]);
      expect(storedDevice()).toEqual({
        userId: ME,
        endpoint,
        notifierUserId: NOTIFIER,
        registeredAtMs: START,
      });
    });

    it("converts CasualOS's URL-safe VAPID key to the bytes it encodes", () => {
      const bytes = applicationServerKeyBytes(VAPID_KEY);

      expect(bytes).toHaveLength(65);
      // An uncompressed P-256 point starts with 0x04.
      expect(bytes[0]).toBe(4);
      expect(
        btoa(String.fromCharCode(...bytes))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "")
      ).toBe(VAPID_KEY);
    });

    it("replaces a subscription this browser already had, which may belong to another account", async () => {
      const leftover = browser.subscribed();
      const push = start();
      await settled(push);

      await push.enable();

      expect(leftover.unsubscribe).toHaveBeenCalled();
      const registered = network.calls.find(
        (c) => c.procedure === "subscribeToNotification"
      )!.input.pushSubscription as { endpoint: string };
      expect(registered.endpoint).not.toBe(leftover.endpoint);
      expect(registered.endpoint).toBe(browser.state.subscription!.endpoint);
      expect(push.status.value).toBe("on");
    });

    it("stops, rather than link the previous subscription to this account, when the browser won't end it", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      browser.state.refuseUnsubscribe = true;
      const leftover = browser.subscribed();
      const push = start();
      await settled(push);

      await push.enable();

      expect(push.status.value).toBe("off");
      expect(push.error.value).toBe("failed");
      expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
      expect(network.procedures()).not.toContain("subscribeToNotification");
      expect(browser.state.subscription).toBe(leftover);
      expect(storedDevice()).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        expect.any(String),
        "the browser kept the previous subscription"
      );
    });

    it("stays off when the person blocks notifications at the prompt", async () => {
      browser.state.answer = "denied";
      const push = start();
      await settled(push);

      await push.enable();

      expect(push.status.value).toBe("denied");
      expect(push.error.value).toBeNull();
      expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
      expect(network.calls).toEqual([]);
    });

    it("says the prompt was dismissed when it was closed without an answer", async () => {
      browser.state.answer = "default";
      const push = start();
      await settled(push);

      await push.enable();

      expect(push.status.value).toBe("off");
      expect(push.error.value).toBe("dismissed");
      expect(network.calls).toEqual([]);
    });

    it("stops offering push when CasualOS can't send it", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      network.answers.getNotificationsApplicationServerKey = () => ({
        success: false,
        errorCode: "not_supported",
      });
      const push = start();
      await settled(push);

      await push.enable();

      expect(push.status.value).toBe("unconfigured");
      expect(push.error.value).toBe("unavailable");
      expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
    });

    it.each([
      "recordNotification",
      "subscribeToNotification",
      "grantPermission",
    ])(
      "doesn't claim to be on when %s fails, and ends the half-made subscription",
      async (failing) => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        network.answers[failing] = () => ({
          success: false,
          errorCode: "server_error",
        });
        const push = start();
        await settled(push);

        await push.enable();

        expect(push.status.value).toBe("off");
        expect(push.error.value).toBe("failed");
        expect(browser.state.subscription).toBeNull();
        expect(browser.state.ended).toHaveLength(1);
        expect(storedDevice()).toBeNull();
        expect(warn).toHaveBeenCalledWith(
          expect.any(String),
          `${failing}: server_error`
        );
      }
    );

    it("reports a failure when CasualOS can't be reached", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      network.answers.subscribeToNotification = () => {
        throw new Error("unreachable");
      };
      const push = start();
      await settled(push);

      await push.enable();

      expect(push.status.value).toBe("off");
      expect(push.error.value).toBe("failed");
      expect(browser.state.subscription).toBeNull();
    });

    it("reports a failure when the browser won't subscribe", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      browser.state.subscribeError = new DOMException(
        "Registration failed - push service error",
        "AbortError"
      );
      const push = start();
      await settled(push);

      await push.enable();

      expect(push.status.value).toBe("off");
      expect(push.error.value).toBe("failed");
      expect(network.procedures()).not.toContain("recordNotification");
    });

    it("can be tried again after a failure", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      network.answers.grantPermission = () => ({
        success: false,
        errorCode: "server_error",
      });
      const push = start();
      await settled(push);
      await push.enable();

      network.answers.grantPermission = () => ({ success: true });
      await push.enable();

      expect(push.status.value).toBe("on");
      expect(push.error.value).toBeNull();
    });

    it("doesn't finish for an account that signed out partway", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      network.answers.subscribeToNotification = () => {
        userId.value = OTHER_USER;
        return { success: true, subscriptionId: "s-1" };
      };
      const push = start();
      await settled(push);

      await push.enable();

      expect(network.procedures()).not.toContain("grantPermission");
      expect(browser.state.subscription).toBeNull();
      expect(storedDevice()).toBeNull();
      await expect(settled(push)).resolves.toBe("off");
      expect(push.error.value).toBeNull();
    });

    it("shows that it's working while it runs", async () => {
      let answerKey!: () => void;
      const keyAnswered = new Promise<void>((resolve) => (answerKey = resolve));
      const realFetch = globalThis.fetch;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          if (String(input) === CASUALOS) {
            await keyAnswered;
          }
          return realFetch(input, init);
        })
      );
      const push = start();
      await settled(push);

      const enabling = push.enable();
      expect(push.isBusy.value).toBe(true);
      answerKey();
      await enabling;

      expect(push.isBusy.value).toBe(false);
      expect(push.status.value).toBe("on");
    });
  });

  describe("disable()", () => {
    it("ends this browser's subscription and nothing else", async () => {
      const subscription = pushWasOnFor(ME);
      const push = start();
      await expect(settled(push)).resolves.toBe("on");

      await push.disable();

      expect(push.status.value).toBe("off");
      expect(subscription.unsubscribe).toHaveBeenCalled();
      expect(storedDevice()).toBeNull();
      // Unsubscribing the account from its inbox, or taking the notifier's
      // permission away, would end push on the account's other devices too.
      expect(network.calls).toEqual([]);
    });

    it("stays on, and says so, when the browser won't let go of the subscription", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      pushWasOnFor(ME);
      const push = start();
      await settled(push);
      browser.state.refuseUnsubscribe = true;

      await push.disable();

      expect(push.status.value).toBe("on");
      expect(push.error.value).toBe("failed");
    });
  });

  describe("following the account", () => {
    it("ends the subscription when its account signs out", async () => {
      const subscription = pushWasOnFor(ME);
      const push = start();
      await expect(settled(push)).resolves.toBe("on");

      userId.value = null;

      await vi.waitFor(() =>
        expect(subscription.unsubscribe).toHaveBeenCalled()
      );
      expect(push.status.value).toBe("signed-out");
      expect(storedDevice()).toBeNull();
    });

    it("ends the previous account's subscription when another signs in", async () => {
      const subscription = pushWasOnFor(ME);
      const push = start();
      await settled(push);

      userId.value = OTHER_USER;

      await vi.waitFor(() =>
        expect(subscription.unsubscribe).toHaveBeenCalled()
      );
      await expect(settled(push)).resolves.toBe("off");
      expect(storedDevice()).toBeNull();
    });

    it("ends a subscription left by another account before the app opened", async () => {
      const subscription = pushWasOnFor(OTHER_USER);
      const push = start();

      await expect(settled(push)).resolves.toBe("off");
      expect(subscription.unsubscribe).toHaveBeenCalled();
      expect(storedDevice()).toBeNull();
    });

    it("ends a subscription it can't tell the owner of, when signed out", async () => {
      userId.value = null;
      browser.state.permission = "granted";
      const subscription = browser.subscribed();
      const push = start();

      await expect(settled(push)).resolves.toBe("signed-out");
      expect(subscription.unsubscribe).toHaveBeenCalled();
    });

    it("keeps working when ending the old subscription fails", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      browser.state.refuseUnsubscribe = true;
      pushWasOnFor(OTHER_USER);
      const push = start();

      await expect(settled(push)).resolves.toBe("off");
      expect(storedDevice()).toBeNull();
    });
  });

  describe("keeping CasualOS up to date", () => {
    it("registers this browser again once a day", async () => {
      const subscription = pushWasOnFor(ME, { registeredAtMs: START - DAY_MS });
      const push = start();

      await expect(settled(push)).resolves.toBe("on");
      await vi.waitFor(() =>
        expect(network.calls).toEqual([
          {
            procedure: "registerPushSubscription",
            input: { pushSubscription: subscription.toJSON() },
          },
        ])
      );
      expect(storedDevice()).toMatchObject({ registeredAtMs: START });
    });

    it("doesn't register again within the day", async () => {
      pushWasOnFor(ME, { registeredAtMs: START - DAY_MS + 60_000 });
      const push = start();

      await expect(settled(push)).resolves.toBe("on");
      expect(network.calls).toEqual([]);
    });

    it("stays on, and tries again next time, when registering fails", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      network.answers.registerPushSubscription = () => ({
        success: false,
        errorCode: "server_error",
      });
      pushWasOnFor(ME, { registeredAtMs: START - 2 * DAY_MS });
      const push = start();

      await expect(settled(push)).resolves.toBe("on");
      expect(storedDevice()).toMatchObject({
        registeredAtMs: START - 2 * DAY_MS,
      });
    });

    it("registers a subscription the browser renewed", async () => {
      pushWasOnFor(ME, { endpoint: "https://push.example/old" });
      const push = start();

      await expect(settled(push)).resolves.toBe("on");
      expect(network.procedures()).toEqual(["registerPushSubscription"]);
      expect(storedDevice()).toMatchObject({
        endpoint: browser.state.subscription!.endpoint,
      });
    });

    it("allows a new notifier account when the server's changes", async () => {
      pushWasOnFor(ME, { notifierUserId: "old-notifier" });
      const push = start();

      await expect(settled(push)).resolves.toBe("on");
      await vi.waitFor(() =>
        expect(network.calls).toEqual([
          {
            procedure: "grantPermission",
            input: expect.objectContaining({
              recordName: ME,
              permission: expect.objectContaining({
                subjectId: NOTIFIER,
                resourceId: "inbox",
                action: "send",
              }),
            }),
          },
        ])
      );
      expect(storedDevice()).toMatchObject({ notifierUserId: NOTIFIER });
    });

    it("stops for an account that signs out while re-registering, rather than carry on as the next one", async () => {
      const subscription = pushWasOnFor(ME, {
        registeredAtMs: START - DAY_MS,
        notifierUserId: "old-notifier",
      });
      network.answers.registerPushSubscription = () => {
        userId.value = OTHER_USER;
        return { success: true };
      };
      const push = start();

      await vi.waitFor(() =>
        expect(subscription.unsubscribe).toHaveBeenCalled()
      );
      await expect(settled(push)).resolves.toBe("off");
      // Granting would have asked CasualOS, with the new account's session,
      // to change the previous account's permissions.
      expect(network.procedures()).toEqual(["registerPushSubscription"]);
      expect(storedDevice()).toBeNull();
    });
  });

  describe("pushes arriving while the app is open", () => {
    it("are passed on, and other worker messages aren't", async () => {
      const onPushReceived = vi.fn();
      const push = start({ onPushReceived });
      await settled(push);

      browser.container.dispatchEvent(
        new MessageEvent("message", { data: { type: "something-else" } })
      );
      browser.container.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "sb-push-received", tag: "friend-request" },
        })
      );

      expect(onPushReceived).toHaveBeenCalledTimes(1);
    });

    it("stop being passed on once disposed", async () => {
      const onPushReceived = vi.fn();
      const push = start({ onPushReceived });
      await settled(push);

      push.dispose();
      browser.container.dispatchEvent(
        new MessageEvent("message", { data: { type: "sb-push-received" } })
      );

      expect(onPushReceived).not.toHaveBeenCalled();
    });
  });

  describe("a push tapped while the app is open", () => {
    /** What the worker sends: the question, and a port for the answer. */
    const askToOpen = () => {
      const answers: unknown[] = [];
      const port = { postMessage: vi.fn((answer) => answers.push(answer)) };
      browser.container.dispatchEvent(
        Object.assign(new Event("message"), {
          data: { type: "sb-open-notifications" },
          ports: [port],
        })
      );
      return answers;
    };

    it("opens the list here and tells the worker, so it doesn't reload the window", async () => {
      const onOpenRequested = vi.fn();
      const push = start({ onOpenRequested });
      await settled(push);

      const answers = askToOpen();

      expect(onOpenRequested).toHaveBeenCalledTimes(1);
      expect(answers).toEqual([{ opened: true }]);
    });

    it("doesn't answer when there's nothing to open the list with, so the worker reloads the window", async () => {
      const push = start();
      await settled(push);

      expect(askToOpen()).toEqual([]);
    });

    it("doesn't answer once disposed", async () => {
      const onOpenRequested = vi.fn();
      const push = start({ onOpenRequested });
      await settled(push);

      push.dispose();

      expect(askToOpen()).toEqual([]);
      expect(onOpenRequested).not.toHaveBeenCalled();
    });
  });

  describe("notifyFriendRequestSent()", () => {
    it("asks the relay to push the request, as the signed-in user", async () => {
      const push = start();

      await push.notifyFriendRequestSent("sp-42");

      expect(network.relayPosts).toEqual([
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SESSION_KEY}`,
          },
          body: { requestId: "sp-42" },
        },
      ]);
    });

    it("works in a browser that can't receive pushes itself", async () => {
      browser.install = () => {};
      const push = start();
      await expect(settled(push)).resolves.toBe("unsupported");

      await push.notifyFriendRequestSent("sp-42");

      expect(network.relayPosts).toHaveLength(1);
    });

    it("asks nothing when the server has no push relay", async () => {
      network.config = { push: null };
      const push = start();

      await push.notifyFriendRequestSent("sp-42");

      expect(network.relayPosts).toEqual([]);
    });

    it("still asks when the relay's config couldn't be read", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      network.configFailure = "offline";
      const push = start();

      await push.notifyFriendRequestSent("sp-42");

      expect(network.relayPosts).toHaveLength(1);
    });

    it("asks nothing while signed out", async () => {
      os.sessionKey.value = null;
      const push = start();

      await push.notifyFriendRequestSent("sp-42");

      expect(network.relayPosts).toEqual([]);
    });

    it("logs, and doesn't throw, when the relay refuses", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      network.relayAnswer = () =>
        Response.json({ error: "rate_limited" }, { status: 429 });
      const push = start();

      await expect(push.notifyFriendRequestSent("sp-42")).resolves.toBe(
        undefined
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("429"));
    });

    it("logs, and doesn't throw, when the relay can't be reached", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      network.relayAnswer = () => {
        throw new TypeError("Failed to fetch");
      };
      const push = start();

      await expect(push.notifyFriendRequestSent("sp-42")).resolves.toBe(
        undefined
      );
      expect(warn).toHaveBeenCalled();
    });

    it("is asked for each new friend request sent", async () => {
      const push = start();
      fakeSharedPermissions(os, () => userId.peek());
      const friends = createFriendsManager(os, login, {
        onRequestSent: (requestId) =>
          void push.notifyFriendRequestSent(requestId),
      });

      try {
        const result = await friends.sendRequest({ userId: OTHER_USER });

        await vi.waitFor(() =>
          expect(network.relayPosts).toEqual([
            expect.objectContaining({
              body: {
                requestId: result.status === "sent" ? result.requestId : "",
              },
            }),
          ])
        );
      } finally {
        friends.dispose();
      }
    });
  });
});
