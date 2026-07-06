import { signal } from "@preact/signals";
import { CreateTwitchSubState } from "@packages/twitchSub-extension/ext_twitchSub/client/twitchSubManager";
import type { Mock } from "vitest";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", () => ({
  useI18n: vi.fn(),
  i18n: {},
}));

vi.mock("@packages/twitchSub-extension/ext_twitchSub/client/App", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@packages/twitchSub-extension/ext_twitchSub/client/icons", () => ({
  __esModule: true,
  TwitchIcon: () => null,
}));

function makeBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
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

function createSeedBibleStateMock() {
  const selectTranslationAndChapter = vi.fn().mockResolvedValue(undefined);
  const decorateVerses = vi.fn();
  const readingState = {
    selectTranslationAndChapter,
  };
  const selectedPane = {
    id: "pane-1",
    tab: {
      readingState,
    },
  };

  const selectedTabId = signal("tab-1");
  const tabs = signal([
    {
      id: "tab-1",
      readingState: {
        decorateVerses,
      },
    },
  ]);

  const seedBibleState = {
    app: {
      currentReadingState: signal({
        translationId: "AAB",
        bookId: "GEN",
        chapterNumber: 1,
      }),
    },
    bibleData: {
      api: {
        endpoint: "https://initial.example.org",
        getAvailableTranslations: vi.fn().mockResolvedValue(undefined),
      },
    },
    panes: {
      panes: signal([selectedPane]),
      selectedPaneId: signal("pane-1"),
      selectPane: vi.fn(),
      openInPane: vi.fn(),
    },
    tabs: {
      selectedTabId,
      tabs,
      addTab: vi.fn().mockReturnValue({
        id: "tab-2",
        readingState,
      }),
    },
    navigation: {
      replace: vi.fn(),
    },
  };

  return {
    seedBibleState,
    selectTranslationAndChapter,
    decorateVerses,
  };
}

describe("CreateTwitchSubState", () => {
  let websocketCtorMock: Mock<any>;
  let errorSpy: Mock;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let fetchMock: Mock;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    fetchMock = vi.spyOn(window, "fetch").mockImplementation(
      async () =>
        ({
          json: async () => ({
            user_id: "bot-user-1",
          }),
        }) as any
    );

    websocketCtorMock = vi.fn(
      class {
        onerror = null;
        onopen = null;
        onmessage = null;
      }
    );
    (globalThis as any).WebSocket = websocketCtorMock;
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("loads config from URL state into sessionStorage", async () => {
    const statePayload = makeBase64(
      JSON.stringify({
        broadcaster_id: "broadcaster-1",
        channel_id: "channel-1",
        book: "JHN",
        chapter: "3",
        translation: "ESV",
      })
    );
    jsdom.reconfigure({
      url: `https://example.com/#access_token=token-1&state=${encodeURIComponent(statePayload)}`,
    });

    const { seedBibleState, selectTranslationAndChapter } =
      createSeedBibleStateMock();
    CreateTwitchSubState(seedBibleState as any);

    await waitFor(() => selectTranslationAndChapter.mock.calls.length >= 1);

    // The book/chapter/translation from the URL are applied to the reader...
    expect(selectTranslationAndChapter).toHaveBeenCalledWith("ESV", "JHN", 3);

    const stored = JSON.parse(
      window.sessionStorage.getItem("twitchSubConfig") as string
    );
    // ...and then consumed (nulled) in the persisted config so they aren't
    // re-applied on the next load, while the connection details are kept.
    expect(stored).toMatchObject({
      botUserId: "bot-user-1",
      accessToken: "token-1",
      clientId: "cfjslv2429r70ek579iogr02vecn6d",
      broadcasterId: "broadcaster-1",
      eventSubWebsocketUrl: "wss://eventsub.wss.twitch.tv/ws",
      channelId: "channel-1",
      bookId: null,
      chapter: null,
      translation: null,
    });

    // expect(goToURLMock).toHaveBeenCalledWith("https://example.com/");
  });

  it("opens a websocket connection to the eventsub websocket URL", async () => {
    window.sessionStorage.setItem(
      "twitchSubConfig",
      JSON.stringify({
        botUserId: "bot-user-1",
        accessToken: "token-1",
        clientId: "cfjslv2429r70ek579iogr02vecn6d",
        broadcasterId: "broadcaster-1",
        eventSubWebsocketUrl: "wss://eventsub.wss.twitch.tv/ws",
        channelId: "channel-1",
        bookId: null,
        chapter: null,
        translation: null,
      })
    );

    const { seedBibleState } = createSeedBibleStateMock();
    CreateTwitchSubState(seedBibleState as any);

    await waitFor(() => websocketCtorMock.mock.calls.length >= 1);
    expect(websocketCtorMock).toHaveBeenCalledWith(
      "wss://eventsub.wss.twitch.tv/ws"
    );
  });

  it("updates the selected pane to config translation, book, and chapter", async () => {
    window.sessionStorage.setItem(
      "twitchSubConfig",
      JSON.stringify({
        botUserId: "bot-user-1",
        accessToken: "token-1",
        clientId: "cfjslv2429r70ek579iogr02vecn6d",
        broadcasterId: "broadcaster-1",
        eventSubWebsocketUrl: "wss://eventsub.wss.twitch.tv/ws",
        channelId: "channel-1",
        bookId: "LUK",
        chapter: "4",
        translation: "KJV",
      })
    );

    const { seedBibleState, selectTranslationAndChapter } =
      createSeedBibleStateMock();
    CreateTwitchSubState(seedBibleState as any);

    await waitFor(() => selectTranslationAndChapter.mock.calls.length >= 1);

    expect(seedBibleState.panes.selectPane).toHaveBeenCalledWith("pane-1");
    expect(selectTranslationAndChapter).toHaveBeenCalledWith("KJV", "LUK", 4);
  });

  it("responds to bookChanged websocket events", async () => {
    window.sessionStorage.setItem(
      "twitchSubConfig",
      JSON.stringify({
        botUserId: "bot-user-1",
        accessToken: "token-1",
        clientId: "cfjslv2429r70ek579iogr02vecn6d",
        broadcasterId: "broadcaster-1",
        eventSubWebsocketUrl: "wss://eventsub.wss.twitch.tv/ws",
        channelId: "channel-1",
        bookId: null,
        chapter: null,
        translation: null,
      })
    );

    const { seedBibleState, selectTranslationAndChapter } =
      createSeedBibleStateMock();
    const state = CreateTwitchSubState(seedBibleState as any);

    state.websocketSessionID.value = "session-1" as any;
    state.webSocketClient.value = {} as any;

    await state.handleWSEvents({
      type: "bookChanged",
      payload: JSON.stringify({
        translation: "NIV",
        baseUrl: "https://new.example.org",
        bookId: "ROM",
        chapter: "8",
        followTranslation: true,
      }),
    });

    expect(
      seedBibleState.bibleData.api.getAvailableTranslations
    ).toHaveBeenCalledWith("https://new.example.org");
    expect(selectTranslationAndChapter).toHaveBeenCalledWith("NIV", "ROM", 8);
  });

  it("does not change translation when followTranslation or translationEnabled are false", async () => {
    window.sessionStorage.setItem(
      "twitchSubConfig",
      JSON.stringify({
        botUserId: "bot-user-1",
        accessToken: "token-1",
        clientId: "cfjslv2429r70ek579iogr02vecn6d",
        broadcasterId: "broadcaster-1",
        eventSubWebsocketUrl: "wss://eventsub.wss.twitch.tv/ws",
        channelId: "channel-1",
        bookId: null,
        chapter: null,
        translation: null,
      })
    );

    const { seedBibleState, selectTranslationAndChapter } =
      createSeedBibleStateMock();
    const state = CreateTwitchSubState(seedBibleState as any);

    state.websocketSessionID.value = "session-1" as any;
    state.webSocketClient.value = {} as any;

    await state.handleWSEvents({
      type: "bookChanged",
      payload: JSON.stringify({
        translation: "NIV",
        baseUrl: "https://initial.example.org",
        bookId: "ROM",
        chapter: "8",
        followTranslation: false,
      }),
    });

    expect(selectTranslationAndChapter).toHaveBeenLastCalledWith(
      "AAB",
      "ROM",
      8
    );

    state.settings.value.translationEnabled.value = false;
    await state.handleWSEvents({
      type: "bookChanged",
      payload: JSON.stringify({
        translation: "NIV",
        baseUrl: "https://initial.example.org",
        bookId: "MRK",
        chapter: "2",
        followTranslation: true,
      }),
    });

    expect(selectTranslationAndChapter).toHaveBeenLastCalledWith(
      "AAB",
      "MRK",
      2
    );
  });

  it("uses incoming book and chapter when chapterFollowEnabled is true", async () => {
    window.sessionStorage.setItem(
      "twitchSubConfig",
      JSON.stringify({
        botUserId: "bot-user-1",
        accessToken: "token-1",
        clientId: "cfjslv2429r70ek579iogr02vecn6d",
        broadcasterId: "broadcaster-1",
        eventSubWebsocketUrl: "wss://eventsub.wss.twitch.tv/ws",
        channelId: "channel-1",
        bookId: null,
        chapter: null,
        translation: null,
      })
    );

    const { seedBibleState, selectTranslationAndChapter } =
      createSeedBibleStateMock();
    const state = CreateTwitchSubState(seedBibleState as any);

    state.websocketSessionID.value = "session-1" as any;
    state.webSocketClient.value = {} as any;
    state.settings.value.chapterFollowEnabled.value = true;

    await state.handleWSEvents({
      type: "bookChanged",
      payload: JSON.stringify({
        translation: "NIV",
        baseUrl: "https://initial.example.org",
        bookId: "ACT",
        chapter: "9",
        followTranslation: true,
      }),
    });

    expect(selectTranslationAndChapter).toHaveBeenLastCalledWith(
      "NIV",
      "ACT",
      9
    );
  });

  it("keeps current book and chapter when chapterFollowEnabled is false", async () => {
    window.sessionStorage.setItem(
      "twitchSubConfig",
      JSON.stringify({
        botUserId: "bot-user-1",
        accessToken: "token-1",
        clientId: "cfjslv2429r70ek579iogr02vecn6d",
        broadcasterId: "broadcaster-1",
        eventSubWebsocketUrl: "wss://eventsub.wss.twitch.tv/ws",
        channelId: "channel-1",
        bookId: null,
        chapter: null,
        translation: null,
      })
    );

    const { seedBibleState, selectTranslationAndChapter } =
      createSeedBibleStateMock();
    const state = CreateTwitchSubState(seedBibleState as any);

    state.websocketSessionID.value = "session-1" as any;
    state.webSocketClient.value = {} as any;
    state.settings.value.chapterFollowEnabled.value = false;

    await state.handleWSEvents({
      type: "bookChanged",
      payload: JSON.stringify({
        translation: "NIV",
        baseUrl: "https://initial.example.org",
        bookId: "ACT",
        chapter: "9",
        followTranslation: true,
      }),
    });

    expect(selectTranslationAndChapter).toHaveBeenLastCalledWith(
      "NIV",
      "GEN",
      1
    );
  });

  it("responds to highlightsChanged websocket events", async () => {
    window.sessionStorage.setItem(
      "twitchSubConfig",
      JSON.stringify({
        botUserId: "bot-user-1",
        accessToken: "token-1",
        clientId: "cfjslv2429r70ek579iogr02vecn6d",
        broadcasterId: "broadcaster-1",
        eventSubWebsocketUrl: "wss://eventsub.wss.twitch.tv/ws",
        channelId: "channel-1",
        bookId: null,
        chapter: null,
        translation: null,
      })
    );

    const { seedBibleState, decorateVerses } = createSeedBibleStateMock();
    const state = CreateTwitchSubState(seedBibleState as any);

    state.websocketSessionID.value = "session-1" as any;
    state.webSocketClient.value = {} as any;

    await state.handleWSEvents({
      type: "highlightsChanged",
      payload: JSON.stringify({
        highlights: ["ROM:8:5:yellow", "ROM:8:10-12:red:#ffeeaa:#111111"],
      }),
    });

    expect(decorateVerses).toHaveBeenCalledTimes(2);
    expect(decorateVerses).toHaveBeenNthCalledWith(1, "ROM", 8, 5, {
      style: {
        color: "inherit",
        backgroundColor: null,
      },
      className: "sb-highlight-yellow",
      preserveOnChapterChange: true,
    });
    expect(decorateVerses).toHaveBeenNthCalledWith(2, "ROM", 8, [10, 11, 12], {
      style: {
        color: "#111111",
        backgroundColor: "#ffeeaa",
      },
      className: "sb-highlight-red",
      preserveOnChapterChange: true,
    });
  });

  it("ignores highlightsChanged events when highlight follow is disabled", async () => {
    window.sessionStorage.setItem(
      "twitchSubConfig",
      JSON.stringify({
        botUserId: "bot-user-1",
        accessToken: "token-1",
        clientId: "cfjslv2429r70ek579iogr02vecn6d",
        broadcasterId: "broadcaster-1",
        eventSubWebsocketUrl: "wss://eventsub.wss.twitch.tv/ws",
        channelId: "channel-1",
        bookId: null,
        chapter: null,
        translation: null,
      })
    );

    const { seedBibleState, decorateVerses } = createSeedBibleStateMock();
    const state = CreateTwitchSubState(seedBibleState as any);

    state.websocketSessionID.value = "session-1" as any;
    state.webSocketClient.value = {} as any;
    state.settings.value.highlightEnabled.value = false;

    await state.handleWSEvents({
      type: "highlightsChanged",
      payload: JSON.stringify({
        highlights: ["ROM:8:5:yellow"],
      }),
    });

    expect(decorateVerses).not.toHaveBeenCalled();
  });
});
