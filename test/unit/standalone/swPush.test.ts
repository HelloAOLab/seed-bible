import {
  FALLBACK_PUSH_BODY,
  FALLBACK_PUSH_TITLE,
  notificationClickUrl,
  openNotificationUrl,
  pushDisplay,
  readPushData,
  sameOriginUrl,
  type WindowClientLike,
} from "../../../standalone/swPush";

const ORIGIN = "https://seedbible.org";
const HOME = "https://seedbible.org/";

/** What the relay sends for a friend request. */
const FRIEND_REQUEST_PUSH = {
  title: "New friend request",
  body: "Ada wants to be your friend on Seed Bible.",
  icon: "https://favicon.ao.bot/pwa/pwa-192x192.png",
  tag: "friend-request",
  timestamp: 1_700_000_000_000,
  action: { type: "open_url", url: `${ORIGIN}/?notifications=open` },
};

const genericNotification = {
  title: FALLBACK_PUSH_TITLE,
  options: { body: FALLBACK_PUSH_BODY, data: { url: HOME } },
};

describe("readPushData", () => {
  it("parses the push's JSON", () => {
    expect(readPushData({ json: () => ({ title: "Hi" }) })).toEqual({
      title: "Hi",
    });
  });

  it("is null for a push with no data, or data that isn't JSON", () => {
    expect(readPushData(null)).toBeNull();
    expect(readPushData(undefined)).toBeNull();
    expect(
      readPushData({
        json: () => {
          throw new SyntaxError("Unexpected token");
        },
      })
    ).toBeNull();
  });
});

describe("pushDisplay", () => {
  it("shows a friend request push as sent, opening the notifications list", () => {
    expect(pushDisplay(FRIEND_REQUEST_PUSH, ORIGIN)).toEqual({
      title: "New friend request",
      options: {
        body: "Ada wants to be your friend on Seed Bible.",
        icon: "https://favicon.ao.bot/pwa/pwa-192x192.png",
        badge: undefined,
        tag: "friend-request",
        timestamp: 1_700_000_000_000,
        silent: undefined,
        data: { url: `${ORIGIN}/?notifications=open` },
      },
    });
  });

  it.each([
    ["no data", null],
    ["data that isn't an object", "hello"],
    ["no title", { body: "Something happened" }],
    ["a blank title", { title: "  ", body: "Something happened" }],
    ["a title that isn't text", { title: 42 }],
  ])("still shows something for a push with %s", (_label, payload) => {
    expect(pushDisplay(payload, ORIGIN)).toEqual(genericNotification);
  });

  it("drops fields of the wrong type rather than passing them on", () => {
    const display = pushDisplay(
      {
        title: "Hello",
        body: 12,
        icon: { src: "x" },
        tag: null,
        timestamp: "yesterday",
        silent: "yes",
      },
      ORIGIN
    );
    expect(display.options).toEqual({
      body: undefined,
      icon: undefined,
      badge: undefined,
      tag: undefined,
      timestamp: undefined,
      silent: undefined,
      data: { url: HOME },
    });
  });

  it("opens the home page for a link to another site", () => {
    const display = pushDisplay(
      {
        ...FRIEND_REQUEST_PUSH,
        action: { type: "open_url", url: "https://evil.example/phish" },
      },
      ORIGIN
    );
    expect(display.options.data.url).toBe(HOME);
  });

  it("never follows a webhook action or extra action buttons", () => {
    const display = pushDisplay(
      {
        ...FRIEND_REQUEST_PUSH,
        action: {
          type: "webhook",
          method: "POST",
          url: `${ORIGIN}/api/something`,
        },
        actions: [
          {
            title: "Open",
            action: { type: "open_url", url: `${ORIGIN}/other` },
          },
        ],
      },
      ORIGIN
    );
    expect(display.options.data.url).toBe(HOME);
    expect(display.options).not.toHaveProperty("actions");
  });
});

describe("sameOriginUrl / notificationClickUrl", () => {
  it("keeps a link on this site, resolving a relative one", () => {
    expect(sameOriginUrl(`${ORIGIN}/en/today`, ORIGIN)).toBe(
      `${ORIGIN}/en/today`
    );
    expect(sameOriginUrl("/?notifications=open", ORIGIN)).toBe(
      `${ORIGIN}/?notifications=open`
    );
  });

  it.each([
    ["another site", "https://example.com/"],
    ["a lookalike host", "https://seedbible.org.example.com/"],
    ["another scheme", "http://seedbible.org/"],
    ["a script", "javascript:alert(1)"],
    ["something that isn't a link", 42],
    ["nothing", undefined],
  ])("turns %s into the home page", (_label, url) => {
    expect(sameOriginUrl(url, ORIGIN)).toBe(HOME);
  });

  it("reads the link from a notification's data", () => {
    expect(
      notificationClickUrl({ url: `${ORIGIN}/?notifications=open` }, ORIGIN)
    ).toBe(`${ORIGIN}/?notifications=open`);
    expect(notificationClickUrl(null, ORIGIN)).toBe(HOME);
    expect(notificationClickUrl({ url: "https://example.com/" }, ORIGIN)).toBe(
      HOME
    );
  });
});

describe("openNotificationUrl", () => {
  const TARGET = `${ORIGIN}/?notifications=open`;

  const windowAt = (
    url: string,
    navigate?: WindowClientLike["navigate"]
  ): WindowClientLike & { focus: ReturnType<typeof vi.fn> } => ({
    url,
    focus: vi.fn(async () => undefined),
    navigate,
  });

  const clientsWith = (...windows: WindowClientLike[]) => ({
    matchAll: vi.fn(async () => windows),
    openWindow: vi.fn(async () => null),
  });

  it("focuses an open window and takes it to the link", async () => {
    const navigate = vi.fn(async () => ({}));
    const open = windowAt(`${ORIGIN}/en/genesis/1`, navigate);
    const clients = clientsWith(open);

    await openNotificationUrl(TARGET, clients);

    expect(open.focus).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(TARGET);
    expect(clients.openWindow).not.toHaveBeenCalled();
  });

  it("opens a window when none is open", async () => {
    const clients = clientsWith();

    await openNotificationUrl(TARGET, clients);

    expect(clients.openWindow).toHaveBeenCalledWith(TARGET);
  });

  it("leaves branch previews alone", async () => {
    const navigate = vi.fn(async () => ({}));
    const preview = windowAt(`${ORIGIN}/b/feature/123/en/today`, navigate);
    const clients = clientsWith(preview);

    await openNotificationUrl(TARGET, clients);

    expect(navigate).not.toHaveBeenCalled();
    expect(clients.openWindow).toHaveBeenCalledWith(TARGET);
  });

  it("opens a window when the open one can't be navigated", async () => {
    const noNavigate = windowAt(`${ORIGIN}/en/today`);
    const refuses = windowAt(
      `${ORIGIN}/en/today`,
      vi.fn(async () => {
        throw new TypeError(
          "This service worker is not the client's active service worker."
        );
      })
    );
    const goesNowhere = windowAt(
      `${ORIGIN}/en/today`,
      vi.fn(async () => null)
    );

    for (const open of [noNavigate, refuses, goesNowhere]) {
      const clients = clientsWith(open);
      await openNotificationUrl(TARGET, clients);
      expect(clients.openWindow).toHaveBeenCalledWith(TARGET);
    }
  });

  it("opens a window when focusing the open one fails", async () => {
    const open = windowAt(
      `${ORIGIN}/en/today`,
      vi.fn(async () => ({}))
    );
    open.focus.mockRejectedValue(new Error("Not allowed to focus"));
    const clients = clientsWith(open);

    await openNotificationUrl(TARGET, clients);

    expect(clients.openWindow).toHaveBeenCalledWith(TARGET);
  });
});
