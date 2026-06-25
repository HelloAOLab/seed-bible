import { CreateTwitchPubState } from "@packages/twitchPub-extension/ext_twitchPub/host/twitchPubManager";
import sendMessage from "@packages/twitchPub-extension/ext_twitchPub/host/sendMessage";
import { TextEncoder } from "node:util";
import type { Mock } from "vitest";

vi.mock("@packages/twitchPub-extension/ext_twitchPub/host/sendMessage", () => ({
  __esModule: true,
  default: vi.fn(),
}));

const sendMessageMock = sendMessage as Mock;

function waitFor(condition: () => boolean, timeoutMs = 4000): Promise<void> {
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

function hasBookChangedPayload(expected: {
  translation?: string;
  baseUrl?: string;
  bookId?: string;
  chapter?: number;
  followTranslation?: boolean;
}): boolean {
  return sendMessageMock.mock.calls.some((call) => {
    const envelopeRaw = call?.[0]?.message;
    if (typeof envelopeRaw !== "string") {
      return false;
    }

    let envelope: {
      type?: string;
      payload?: string;
    };
    try {
      envelope = JSON.parse(envelopeRaw);
    } catch {
      return false;
    }
    if (
      envelope.type !== "bookChanged" ||
      typeof envelope.payload !== "string"
    ) {
      return false;
    }

    let payload: {
      translation?: string;
      baseUrl?: string;
      bookId?: string;
      chapter?: number;
      followTranslation?: boolean;
    };
    try {
      payload = JSON.parse(envelope.payload);
    } catch {
      return false;
    }

    return Object.entries(expected).every(
      ([key, value]) => payload[key as keyof typeof payload] === value
    );
  });
}

describe("CreateTwitchPubState", () => {
  let logSpy: Mock;
  let fetchMock: Mock;
  let toastMock: Mock;
  let props: { toast: Mock };

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

    fetchMock = vi.spyOn(window, "fetch").mockImplementation(
      async () =>
        ({
          json: async () => ({}),
        }) as any
    );

    (globalThis as any).TextEncoder = TextEncoder;
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    toastMock = vi.fn();
    props = { toast: toastMock };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    logSpy.mockRestore();
    delete (globalThis as any).TextEncoder;
  });

  it("creates the default state and keeps the current page in localStorage", async () => {
    const state = CreateTwitchPubState(props);

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
    jsdom.reconfigure({
      url: `https://example.com/twitch-pub?existing=1`,
    });

    const state = CreateTwitchPubState(props);

    const url = new URL(state.qrValue.value);
    const redirectUri = new URL(url.searchParams.get("redirect_uri") ?? "");

    expect(redirectUri.origin + redirectUri.pathname).toBe(
      `https://example.com/twitch-pub`
    );
    expect(redirectUri.searchParams.get("autoinstall-ext_twitchSub")).toBe(
      "true"
    );
    expect(redirectUri.origin + redirectUri.pathname).not.toBe(
      "https://example.com/"
    );
  });

  it("includes broadcaster, channel, book, chapter, and translation in QR state", () => {
    const state = CreateTwitchPubState(props);

    state.twitchConfig.value.broadcasterId.value = "broadcaster-123";
    state.twitchConfig.value.userAccessToken.value = "token-123";
    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "ESV",
            bookId: "JHN",
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

    const stateParam = getStateParam(state.qrValue.value);
    expect(stateParam).toBeTruthy();

    const decoded = JSON.parse(
      Buffer.from(stateParam as string, "base64").toString("utf8")
    );

    expect(decoded).toMatchObject({
      broadcaster_id: "broadcaster-123",
      channel_id: "1455265905",
      book: "JHN",
      chapter: 3,
      translation: "ESV",
    });
  });

  it("sends an announcement with the join URL once the user is logged in", async () => {
    jsdom.reconfigure({
      url: `https://example.com/reader?chapter=1`,
    });

    const state = CreateTwitchPubState(props);

    expect(fetchMock).not.toHaveBeenCalled();

    state.twitchConfig.value.broadcasterId.value = "broadcaster-1";
    state.twitchConfig.value.userAccessToken.value = "token-1";

    await waitFor(() => fetchMock.mock.calls.length === 1);

    const [url, options] = fetchMock.mock.calls[0]!;
    const { body, ...otherOptions } = options;
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
      `https://example.com/reader`
    );
    expect(redirectUri.searchParams.get("autoinstall-ext_twitchSub")).toBe(
      "true"
    );
    expect(otherOptions).toEqual({
      method: "POST",
      headers: {
        Authorization: "Bearer token-1",
        "Client-Id": "cfjslv2429r70ek579iogr02vecn6d",
        "Content-Type": "application/json",
      },
    });
  });

  it("sends announcements on a timer when announcementTimer is configured", () => {
    vi.useFakeTimers();
    jsdom.reconfigure({
      url: `https://example.com/reader?chapter=1`,
    });

    const state = CreateTwitchPubState(props);

    state.settings.value.highlight.value = { enabled: false };
    state.twitchConfig.value.broadcasterId.value = "broadcaster-1";
    state.twitchConfig.value.userAccessToken.value = "token-1";
    state.settings.value.announcementTimer.value = {
      enabled: true,
      interval: 5000,
    };

    // expect(fetchMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    let [url, options] = fetchMock.mock.calls[0]!;
    let { body, ...otherOptions } = options;
    let parsedBody = JSON.parse(body as string);
    let announcedUrl = new URL(parsedBody.message.replace("Join me at ", ""));
    let redirectUri = new URL(
      announcedUrl.searchParams.get("redirect_uri") ?? ""
    );

    expect(url).toBe(
      "https://api.twitch.tv/helix/chat/announcements?broadcaster_id=broadcaster-1&moderator_id=broadcaster-1"
    );
    expect(redirectUri.origin + redirectUri.pathname).toBe(
      `https://example.com/reader`
    );
    expect(redirectUri.searchParams.get("autoinstall-ext_twitchSub")).toBe(
      "true"
    );
    expect(otherOptions).toEqual({
      method: "POST",
      headers: {
        Authorization: "Bearer token-1",
        "Client-Id": "cfjslv2429r70ek579iogr02vecn6d",
        "Content-Type": "application/json",
      },
    });

    vi.advanceTimersByTime(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    [url, options] = fetchMock.mock.calls[1]!;
    ({ body, ...otherOptions } = options);
    parsedBody = JSON.parse(body as string);
    announcedUrl = new URL(parsedBody.message.replace("Join me at ", ""));
    redirectUri = new URL(announcedUrl.searchParams.get("redirect_uri") ?? "");

    expect(url).toBe(
      "https://api.twitch.tv/helix/chat/announcements?broadcaster_id=broadcaster-1&moderator_id=broadcaster-1"
    );
    expect(redirectUri.origin + redirectUri.pathname).toBe(
      `https://example.com/reader`
    );
    expect(redirectUri.searchParams.get("autoinstall-ext_twitchSub")).toBe(
      "true"
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

    const state = CreateTwitchPubState(props);

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
    vi.useFakeTimers();

    const state = CreateTwitchPubState(props);

    state.hideUI();
    expect(state.uiHidden.value).toBe(false);

    vi.advanceTimersByTime(3999);
    expect(state.uiHidden.value).toBe(false);

    vi.advanceTimersByTime(1);
    expect(state.uiHidden.value).toBe(true);

    state.showUI();
    expect(state.uiHidden.value).toBe(false);

    state.hideUI();
    vi.advanceTimersByTime(2000);
    state.showUI();
    vi.advanceTimersByTime(4000);

    expect(state.uiHidden.value).toBe(false);
  });

  it("queues book and highlight updates when the payload changes", async () => {
    const state = CreateTwitchPubState(props);

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

  it("sends a book changed event when the chapter changes", async () => {
    const state = CreateTwitchPubState(props);

    state.twitchConfig.value.broadcasterId.value = "broadcaster-1";
    state.twitchConfig.value.senderId.value = "sender-1";
    state.twitchConfig.value.userAccessToken.value = "token-1";

    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "NIV",
            bookId: "MAT",
            chapterNumber: 1,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    await waitFor(() => sendMessageMock.mock.calls.length >= 1);
    sendMessageMock.mockClear();

    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "NIV",
            bookId: "MAT",
            chapterNumber: 2,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    await waitFor(() =>
      hasBookChangedPayload({ translation: "NIV", bookId: "MAT", chapter: 2 })
    );
  });

  it("sends a book changed event when the book changes", async () => {
    const state = CreateTwitchPubState(props);

    state.twitchConfig.value.broadcasterId.value = "broadcaster-1";
    state.twitchConfig.value.senderId.value = "sender-1";
    state.twitchConfig.value.userAccessToken.value = "token-1";

    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "NIV",
            bookId: "MAT",
            chapterNumber: 2,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    await waitFor(() => sendMessageMock.mock.calls.length >= 1);
    sendMessageMock.mockClear();

    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "NIV",
            bookId: "MRK",
            chapterNumber: 2,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    await waitFor(() =>
      hasBookChangedPayload({ translation: "NIV", bookId: "MRK", chapter: 2 })
    );
  });

  it("sends a book changed event when the translation changes", async () => {
    const state = CreateTwitchPubState(props);

    state.twitchConfig.value.broadcasterId.value = "broadcaster-1";
    state.twitchConfig.value.senderId.value = "sender-1";
    state.twitchConfig.value.userAccessToken.value = "token-1";

    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "NIV",
            bookId: "MAT",
            chapterNumber: 2,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    await waitFor(() => sendMessageMock.mock.calls.length >= 1);
    sendMessageMock.mockClear();

    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "ESV",
            bookId: "MAT",
            chapterNumber: 2,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    await waitFor(() =>
      hasBookChangedPayload({ translation: "ESV", bookId: "MAT", chapter: 2 })
    );
  });

  it("tells users whether to follow translation changes", async () => {
    const state = CreateTwitchPubState(props);

    state.twitchConfig.value.broadcasterId.value = "broadcaster-1";
    state.twitchConfig.value.senderId.value = "sender-1";
    state.twitchConfig.value.userAccessToken.value = "token-1";

    state.settings.value.translation.value = { enabled: false };
    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "NIV",
            bookId: "MAT",
            chapterNumber: 2,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    await waitFor(() => hasBookChangedPayload({ followTranslation: false }));

    sendMessageMock.mockClear();
    state.settings.value.translation.value = { enabled: true };
    state.handleSeedBibleUpdate({
      app: {
        currentReadingState: {
          value: {
            translationId: "KJV",
            bookId: "MAT",
            chapterNumber: 2,
          },
        },
      },
      bibleData: {
        api: {
          endpoint: "https://example.org",
        },
      },
    } as any);

    await waitFor(() => hasBookChangedPayload({ followTranslation: true }));
  });
});
