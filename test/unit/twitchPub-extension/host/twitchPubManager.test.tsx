import { CreateTwitchPubState } from "ext_twitchPub.host.twitchPubManager";
import sendMessage from "ext_twitchPub.host.sendMessage";
import { TextEncoder } from "node:util";

jest.mock("ext_twitchPub.host.sendMessage", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const sendMessageMock = sendMessage as jest.Mock;

function waitFor(condition: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (condition()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Timed out waiting for condition."));
        return;
      }
      setTimeout(tick, 0);
    };

    tick();
  });
}

function getStateParam(url: string): string | null {
  return new URL(url).searchParams.get("state");
}

function makeBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

describe("CreateTwitchPubState", () => {
  let logSpy: jest.SpyInstance;
  let bytesToBase64StringMock: jest.Mock;
  let webPostMock: jest.Mock;

  beforeEach(() => {
    window.localStorage.clear();
    delete (window.localStorage as any).currentPage;
    delete (window.localStorage as any).deviceCode;
    delete (window.localStorage as any).broadcasterId;
    delete (window.localStorage as any).senderId;
    delete (window.localStorage as any).userAccessToken;
    delete (window.localStorage as any).interfaceEnabled;
    delete (window.localStorage as any).settings;
    sendMessageMock.mockReset();

    bytesToBase64StringMock = jest.fn((value: Uint8Array) =>
      Buffer.from(value).toString("base64")
    );
    webPostMock = jest.fn().mockResolvedValue({ data: {} });

    (globalThis as any).configBot = {
      tags: {
        pattern: "SeedBible",
      },
    };
    (globalThis as any).bytes = {
      toBase64String: bytesToBase64StringMock,
    };
    (globalThis as any).web = {
      get: jest.fn().mockResolvedValue({ data: { data: [] } }),
      post: webPostMock,
    };
    (globalThis as any).TextEncoder = TextEncoder;
    (globalThis as any).uuid = jest.fn().mockReturnValue("abcde-12345");

    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    logSpy.mockRestore();
    delete (globalThis as any).configBot;
    delete (globalThis as any).bytes;
    delete (globalThis as any).web;
    delete (globalThis as any).TextEncoder;
    delete (globalThis as any).uuid;
  });

  it("creates the default state and keeps the current page in localStorage", async () => {
    const state = CreateTwitchPubState();

    expect(state.interfaceEnabled.value).toBe(false);
    expect(state.currentPage.value).toBe("login");
    expect(state.loading.value).toBe(false);
    expect(state.uiHidden.value).toBe(false);
    expect(state.settings.value.translation.value).toEqual({ enabled: false });
    expect(state.settings.value.highlight.value).toEqual({ enabled: true });
    expect(state.settings.value.announcementTimer.value).toEqual({
      enabled: false,
      interval: 0,
    });
    expect(state.getDeviceAuthUrl).toBeDefined();

    const url = new URL(state.qrValue.value);
    expect(url.origin + url.pathname).toBe(
      "https://id.twitch.tv/oauth2/authorize"
    );
    expect(url.searchParams.get("client_id")).toBe(
      "cfjslv2429r70ek579iogr02vecn6d"
    );
    expect(url.searchParams.get("state")).toBe(
      makeBase64(
        JSON.stringify({
          broadcaster_id: "",
          channel_id: "1455265905",
          book: "GEN",
          chapter: 1,
          translation: "AAB",
        })
      )
    );

    state.setCurrentPage("settings");
    await waitFor(
      () => window.localStorage.getItem("currentPage") === "settings"
    );

    expect(window.localStorage.getItem("currentPage")).toBe("settings");
  });

  it("builds the QR redirect URI from the current location first", () => {
    window.history.replaceState({}, "", "/twitch-pub?existing=1");

    const state = CreateTwitchPubState();

    const url = new URL(state.qrValue.value);
    const redirectUri = new URL(url.searchParams.get("redirect_uri") ?? "");

    expect(redirectUri.origin + redirectUri.pathname).toBe(
      `${window.location.origin}/twitch-pub`
    );
    expect(redirectUri.searchParams.get("pattern")).toBe("SeedBible");
    expect(redirectUri.searchParams.get("ext_twitchPub")).toBe("true");
    expect(redirectUri.origin + redirectUri.pathname).not.toBe(
      "https://ao.bot/"
    );
  });

  it("sends an announcement with the join URL once the user is logged in", async () => {
    window.history.replaceState({}, "", "/reader?chapter=1");

    const state = CreateTwitchPubState();

    expect(webPostMock).not.toHaveBeenCalled();

    state.twitchConfig.value.broadcasterId.value = "broadcaster-1";
    state.twitchConfig.value.userAccessToken.value = "token-1";

    await waitFor(() => webPostMock.mock.calls.length === 1);

    const [url, body, options] = webPostMock.mock.calls[0];
    const parsedBody = JSON.parse(body as string);

    expect(url).toBe(
      "https://api.twitch.tv/helix/chat/announcements?broadcaster_id=broadcaster-1&moderator_id=broadcaster-1"
    );
    expect(parsedBody).toEqual({
      message: expect.stringContaining("Join me at "),
      color: "purple",
    });
    expect(parsedBody.message).toContain("redirect_uri=");
    const announcedUrl = new URL(parsedBody.message.replace("Join me at ", ""));
    const redirectUri = new URL(
      announcedUrl.searchParams.get("redirect_uri") ?? ""
    );

    expect(redirectUri.origin + redirectUri.pathname).toBe(
      `${window.location.origin}/reader`
    );
    expect(redirectUri.searchParams.get("pattern")).toBe("SeedBible");
    expect(redirectUri.searchParams.get("ext_twitchPub")).toBe("true");
    expect(options).toEqual({
      headers: {
        Authorization: "Bearer token-1",
        "Client-Id": "cfjslv2429r70ek579iogr02vecn6d",
        "Content-Type": "application/json",
      },
    });
  });

  it("sends announcements on a timer when announcementTimer is configured", () => {
    jest.useFakeTimers();
    window.history.replaceState({}, "", "/reader?chapter=1");

    const state = CreateTwitchPubState();

    state.settings.value.highlight.value = { enabled: false };
    state.twitchConfig.value.broadcasterId.value = "broadcaster-1";
    state.twitchConfig.value.userAccessToken.value = "token-1";
    state.settings.value.announcementTimer.value = {
      enabled: true,
      interval: 5000,
    };

    expect(webPostMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(5000);
    expect(webPostMock).toHaveBeenCalledTimes(1);

    // eslint-disable-next-line prefer-const
    let [url, body, options] = webPostMock.mock.calls[0];
    let parsedBody = JSON.parse(body as string);
    let announcedUrl = new URL(parsedBody.message.replace("Join me at ", ""));
    let redirectUri = new URL(
      announcedUrl.searchParams.get("redirect_uri") ?? ""
    );

    expect(url).toBe(
      "https://api.twitch.tv/helix/chat/announcements?broadcaster_id=broadcaster-1&moderator_id=broadcaster-1"
    );
    expect(redirectUri.origin + redirectUri.pathname).toBe(
      `${window.location.origin}/reader`
    );
    expect(redirectUri.searchParams.get("pattern")).toBe("SeedBible");
    expect(redirectUri.searchParams.get("ext_twitchPub")).toBe("true");
    expect(options).toEqual({
      headers: {
        Authorization: "Bearer token-1",
        "Client-Id": "cfjslv2429r70ek579iogr02vecn6d",
        "Content-Type": "application/json",
      },
    });

    jest.advanceTimersByTime(5000);
    expect(webPostMock).toHaveBeenCalledTimes(2);

    [url, body] = webPostMock.mock.calls[1];
    parsedBody = JSON.parse(body as string);
    announcedUrl = new URL(parsedBody.message.replace("Join me at ", ""));
    redirectUri = new URL(announcedUrl.searchParams.get("redirect_uri") ?? "");

    expect(url).toBe(
      "https://api.twitch.tv/helix/chat/announcements?broadcaster_id=broadcaster-1&moderator_id=broadcaster-1"
    );
    expect(redirectUri.origin + redirectUri.pathname).toBe(
      `${window.location.origin}/reader`
    );
  });

  it("restores saved values from localStorage", () => {
    window.localStorage.setItem("currentPage", "interface");
    window.localStorage.setItem("deviceCode", "device-123");
    window.localStorage.setItem("broadcasterId", "broadcaster-1");
    window.localStorage.setItem("senderId", "sender-1");
    window.localStorage.setItem("userAccessToken", "token-1");
    window.localStorage.setItem("interfaceEnabled", "true");
    window.localStorage.setItem(
      "settings",
      JSON.stringify({
        translation: { enabled: true },
        highlight: { enabled: false },
        announcementTimer: { enabled: true, interval: 120000 },
      })
    );

    const state = CreateTwitchPubState();

    expect(state.interfaceEnabled.value).toBe(true);
    expect(state.currentPage.value).toBe("interface");
    expect(state.deviceCode.value).toBe("device-123");
    expect(state.twitchConfig.value.broadcasterId.value).toBe("broadcaster-1");
    expect(state.twitchConfig.value.senderId.value).toBe("sender-1");
    expect(state.twitchConfig.value.userAccessToken.value).toBe("token-1");
    expect(state.settings.value.translation.value).toEqual({ enabled: true });
    expect(state.settings.value.highlight.value).toEqual({ enabled: false });
    expect(state.settings.value.announcementTimer.value).toEqual({
      enabled: true,
      interval: 120000,
    });
  });

  it("hides the UI after the delay and can cancel a pending hide", () => {
    jest.useFakeTimers();

    const state = CreateTwitchPubState();

    state.hideUI();
    expect(state.uiHidden.value).toBe(false);

    jest.advanceTimersByTime(3999);
    expect(state.uiHidden.value).toBe(false);

    jest.advanceTimersByTime(1);
    expect(state.uiHidden.value).toBe(true);

    state.showUI();
    expect(state.uiHidden.value).toBe(false);

    state.hideUI();
    jest.advanceTimersByTime(2000);
    state.showUI();
    jest.advanceTimersByTime(4000);

    expect(state.uiHidden.value).toBe(false);
  });

  it("queues book and highlight updates when the payload changes", async () => {
    const state = CreateTwitchPubState();

    state.twitchConfig.value.broadcasterId.value = "broadcaster-1";
    state.twitchConfig.value.senderId.value = "sender-1";
    state.twitchConfig.value.userAccessToken.value = "token-1";

    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "NIV",
            bookId: "EXO",
            chapterNumber: 3,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    expect(getStateParam(state.qrValue.value)).toBe(
      makeBase64(
        JSON.stringify({
          broadcaster_id: "broadcaster-1",
          channel_id: "1455265905",
          book: "EXO",
          chapter: 3,
          translation: "NIV",
        })
      )
    );
    expect(window.localStorage.getItem("prevSeedBibleState")).toBe(
      JSON.stringify({
        translationId: "NIV",
        bookId: "EXO",
        chapterNumber: 3,
      })
    );

    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "NIV",
            bookId: "EXO",
            chapterNumber: 3,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    expect(getStateParam(state.qrValue.value)).toBe(
      makeBase64(
        JSON.stringify({
          broadcaster_id: "broadcaster-1",
          channel_id: "1455265905",
          book: "EXO",
          chapter: 3,
          translation: "NIV",
        })
      )
    );
    expect(window.localStorage.getItem("prevSeedBibleState")).toBe(
      JSON.stringify({
        translationId: "NIV",
        bookId: "EXO",
        chapterNumber: 3,
      })
    );

    state.handleHighlightUpdate([{ colorId: "yellow", verse: 5 }], "EXO", 3);

    expect(window.localStorage.getItem("prevHighlights")).toBe(
      JSON.stringify({
        highlights: ["EXO:3:5:yellow"],
      })
    );

    state.handleHighlightUpdate([{ colorId: "yellow", verse: 5 }], "EXO", 3);

    expect(window.localStorage.getItem("prevHighlights")).toBe(
      JSON.stringify({
        highlights: ["EXO:3:5:yellow"],
      })
    );
  });
});
