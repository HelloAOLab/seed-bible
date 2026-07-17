import { TwitchIcon } from "./icons";
import { initializeTwitchWS } from "./initializeTwitchWS";
import { signal, effect, type Signal } from "@preact/signals";
import { type TwitchSubInterface } from "./interface";
import { type SeedBibleState } from "seed-bible";
import { toByteArray } from "base64-js";
import { render } from "preact";
import type { NavigationManager } from "seed-bible/managers";
import type { Pane } from "seed-bible/managers";

function getBooleanMaskValue(value: unknown, defaultValue: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return defaultValue;
}

export function CreateTwitchSubState(
  seedBibleState: SeedBibleState
): TwitchSubInterface {
  const clientId = "cfjslv2429r70ek579iogr02vecn6d";
  const eventSubWebsocketUrl = "wss://eventsub.wss.twitch.tv/ws";
  const currentPane = signal<Pane | null>(null);

  const wsPaused = signal(
    getBooleanMaskValue(
      window.sessionStorage.getItem("twitchWebsocketClientPaused"),
      false
    )
  );
  const savedSettings = window.sessionStorage.getItem("twitchSubSettings")
    ? JSON.parse(window.sessionStorage.getItem("twitchSubSettings") || "{}")
    : {
        translationEnabled: true,
        highlightEnabled: true,
        refFollowEnabled: true,
        chapterFollowEnabled: true,
      };
  const settings = signal({
    translationEnabled: signal<boolean>(
      savedSettings.translationEnabled ?? true
    ),
    highlightEnabled: signal<boolean>(savedSettings.highlightEnabled ?? true),
    refFollowEnabled: signal<boolean>(savedSettings.refFollowEnabled ?? true),
    chapterFollowEnabled: signal<boolean>(
      savedSettings.chapterFollowEnabled ?? true
    ),
  });
  const config = signal({
    botUserId: signal<string | null>(null),
    accessToken: signal<string | null>(null),
    clientId: signal<string | null>(null),
    broadcasterId: signal<string | null>(null),
    eventSubWebsocketUrl: signal<string | null>(null),
    channelId: signal<string | null>(null),
    bookId: signal<string | null>(null),
    chapter: signal<string | null>(null),
    translation: signal<string | null>(null),
  });
  const websocketSessionID = signal(null);
  const webSocketClient = signal<WebSocket | null>(null);

  const settingsOpened = signal(false);

  effect(() => {
    getConfig({
      clientId,
      eventSubWebsocketUrl,
      navigation: seedBibleState.navigation,
    }).then((configData) => {
      if (configData) {
        config.value.botUserId.value = configData.botUserId;
        config.value.accessToken.value = configData.accessToken;
        config.value.clientId.value = configData.clientId;
        config.value.broadcasterId.value = configData.broadcasterId;
        config.value.eventSubWebsocketUrl.value =
          configData.eventSubWebsocketUrl;
        config.value.channelId.value = configData.channelId;
        config.value.bookId.value = configData.bookId ?? null;
        config.value.chapter.value = configData.chapter ?? null;
        config.value.translation.value = configData.translation ?? null;
      }
    });
  });

  effect(() => {
    if (config.value.accessToken.value) {
      initializeTwitchWS({
        config,
        websocketSessionID,
        webSocketClient,
        wsPaused,
        settings,
        handleWSEvents,
        settingsOpened,
        currentPane,
      });
    }
  });

  effect(() => {
    if (
      config.value.bookId.value &&
      config.value.chapter.value &&
      config.value.translation.value
    ) {
      openBookAndChapter(
        seedBibleState,
        config.value.translation.value,
        config.value.bookId.value,
        config.value.chapter.value
      );
      config.value.bookId.value = null;
      config.value.chapter.value = null;
      config.value.translation.value = null;
      window.sessionStorage.setItem(
        "twitchSubConfig",
        JSON.stringify(config.value)
      );
    }
  });

  effect(() => {
    void seedBibleState.app.isMobile.value;
    if (
      websocketSessionID.value &&
      webSocketClient.value &&
      seedBibleState.app.currentReadingState.value
    ) {
      setTimeout(() => {
        addTwitchIcon({
          wsPaused,
          settingsOpened,
          isMobile: seedBibleState.app.isMobile.value,
        });
      }, 200);
    }
  });

  async function highlightRefVerse(
    seedBibleState: SeedBibleState,
    bookData: {
      book: string;
      chapter: number;
      verse: number;
    },
    interval = 5000
  ): Promise<void> {
    const { book, chapter, verse } = bookData;

    const selectedTabId = seedBibleState.tabs.selectedTabId;
    let selectedTab = seedBibleState.tabs.tabs.value.find(
      (tab) => tab.id === selectedTabId.value
    );

    const currentReadingState = seedBibleState.app.currentReadingState.value;

    if (selectedTab && book) {
      const { bookId, chapterNumber } = selectedTab.readingState;

      if (bookId.value !== book || chapterNumber.value !== Number(chapter)) {
        const existingTab = seedBibleState.tabs.tabs.value.find(
          (tab) =>
            tab.readingState.bookId.value === book &&
            tab.readingState.chapterNumber.value === Number(chapter)
        );
        if (existingTab) {
          seedBibleState.app.selectTab(existingTab.id);
          selectedTab = existingTab;
        } else {
          const newTab = seedBibleState.tabs.addTab(undefined, {
            initialTranslationId: currentReadingState?.translationId || "ABB",
            initialBookId: book,
            initialChapterNumber: Number(chapter),
          });
          seedBibleState.app.selectTab(newTab.id);
          selectedTab = newTab;
        }
      }

      await selectedTab.readingState.selectTranslationAndChapter(
        currentReadingState?.translationId || "ABB",
        book,
        Number(chapter) || 1,
        verse ? { scrollToVerse: Number(verse) } : {}
      );
      if (verse && chapter) {
        selectedTab.readingState.decorateVerses(
          book,
          Number(chapter),
          Number(verse),
          {
            className: "sb-verse-decoration-initial-verse-highlight",
            removeAfterMs: interval,
          }
        );
      }
    }
  }

  async function handleWSEvents(config: { type: string; payload: string }) {
    console.log(config);
    if (!wsPaused.value && websocketSessionID.value && webSocketClient.value) {
      switch (config.type) {
        case "bookChanged": {
          const { translation, baseUrl, bookId, chapter, followTranslation } =
            JSON.parse(config.payload) as {
              translation: string;
              baseUrl: string;
              bookId: string;
              chapter: string;
              followTranslation: boolean;
            };

          const currentEndpoint = seedBibleState.bibleData.api.endpoint;

          if (currentEndpoint !== baseUrl) {
            await seedBibleState.bibleData.api.getAvailableTranslations(
              baseUrl
            );
          }

          await openBookAndChapter(
            seedBibleState,
            settings.value.translationEnabled.value && followTranslation
              ? translation
              : seedBibleState.app.currentReadingState.value?.translationId ||
                  "ABB",
            settings.value.chapterFollowEnabled.value
              ? bookId
              : seedBibleState.app.currentReadingState.value?.bookId || "GEN",
            settings.value.chapterFollowEnabled.value
              ? chapter
              : seedBibleState.app.currentReadingState.value?.chapterNumber?.toString() ||
                  "1"
          );
          break;
        }
        case "highlightsChanged": {
          if (!settings.value.highlightEnabled.value) {
            console.log(
              "Highlight follow is disabled, ignoring highlightsChanged event"
            );
            return;
          }
          const { highlights } = JSON.parse(config.payload) as {
            highlights: Array<string>;
          };

          const highlightConfig = highlights.map((highlight) => {
            const [
              bookId,
              chapter,
              verse,
              color,
              customColor,
              customFontColor,
            ] = highlight.split(":") as [
              string,
              string,
              string,
              string,
              string | undefined,
              string | undefined,
            ];
            const normalizedVerse =
              verse.split("-").length > 1 ? verse.split("-") : verse;
            return {
              bookId,
              chapter,
              verse: normalizedVerse,
              color,
              customColor: customColor,
              customFontColor: customFontColor,
            };
          });

          const selectedTabId = seedBibleState.tabs.selectedTabId;

          const selectedTab = seedBibleState.tabs.tabs.value.find(
            (tab) => tab.id === selectedTabId.value
          );

          if (selectedTab) {
            highlightConfig.forEach((highlight) => {
              selectedTab.readingState.decorateVerses(
                highlight.bookId,
                Number(highlight.chapter),
                Array.isArray(highlight.verse)
                  ? expandRange([
                      Number(highlight.verse[0]),
                      Number(highlight.verse[1]),
                    ])
                  : Number(highlight.verse),
                {
                  style: {
                    color: highlight.customFontColor || "inherit",
                    backgroundColor: highlight.customColor || null,
                  },
                  className: `sb-highlight-${highlight.color}`,
                  preserveOnChapterChange: true,
                }
              );
            });
          }
          break;
        }
        case "refHighlight": {
          if (!settings.value.refFollowEnabled.value) {
            console.log(
              "Reference follow is disabled, ignoring refHighlight event"
            );
            return;
          }
          const { bookId, chapter, verse } = JSON.parse(config.payload) as {
            bookId: string;
            chapter: number;
            verse: number;
          };
          seedBibleState.app.toast(
            `Highlighting ${bookId} ${chapter}:${verse || ""}`
          );
          highlightRefVerse(seedBibleState, { book: bookId, chapter, verse });
          break;
        }
      }
    }
  }

  effect(() => {
    window.sessionStorage.setItem(
      "twitchWebsocketClientPaused",
      wsPaused.value.toString()
    );
    window.sessionStorage.setItem(
      "twitchSubSettings",
      JSON.stringify({
        translationEnabled: settings.value.translationEnabled.value,
        highlightEnabled: settings.value.highlightEnabled.value,
        chapterFollowEnabled: settings.value.chapterFollowEnabled.value,
        refFollowEnabled: settings.value.refFollowEnabled.value,
      })
    );
  });

  return {
    settings,
    config,
    websocketSessionID,
    webSocketClient,
    wsPaused,
    handleWSEvents,
    settingsOpened,
    currentPane,
  };
}

async function getConfig({
  clientId,
  eventSubWebsocketUrl,
  navigation,
}: {
  clientId: string;
  eventSubWebsocketUrl: string;
  navigation: NavigationManager;
}) {
  const stored = window.sessionStorage.getItem("twitchSubConfig");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(
        "Failed to parse Twitch Sub config from session storage:",
        e
      );
      return null;
    }
  }

  const baseUrl = location.href;
  const hash = new URLSearchParams(new URL(baseUrl).hash.slice(1));

  const accessToken = hash.get("access_token");
  if (!accessToken) {
    console.error("No access token found in URL hash.");
    return null;
  }

  const stateBytes = toByteArray(hash.get("state") || "");
  const stateString = new TextDecoder().decode(stateBytes);
  if (!stateString) {
    console.error("No state found in URL hash. Full hash:", hash.toString());
    return null;
  }

  const {
    broadcaster_id: broadcasterId,
    channel_id: channelId,
    book: bookId,
    chapter,
    translation,
  } = JSON.parse(stateString);

  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });

  const data = await res.json();

  if (!data.user_id) {
    console.error("Failed to validate access token. Response:", data);
    return null;
  }

  const config = {
    botUserId: data.user_id,
    accessToken,
    clientId,
    broadcasterId,
    eventSubWebsocketUrl,
    channelId,
    bookId,
    chapter,
    translation,
  };
  window.sessionStorage.setItem("twitchSubConfig", JSON.stringify(config));

  if (typeof posthog !== "undefined") {
    posthog.capture("twitch_sub_client_joined", {});
  }

  const urlWithoutHash = baseUrl.split("#")[0];
  if (urlWithoutHash) {
    navigation.replace(urlWithoutHash);
  }
  return config;
}

async function openBookAndChapter(
  seedBibleState: SeedBibleState,
  translation: string,
  bookId: string,
  chapter: string
) {
  const selectedSlot = seedBibleState.tabsLayout.slots.value.find(
    (slot) => slot.id === seedBibleState.tabsLayout.selectedSlotId.value
  );
  if (!selectedSlot) {
    console.error(
      "No slot found with id:",
      seedBibleState.tabsLayout.selectedSlotId.value
    );
    return;
  }

  seedBibleState.tabsLayout.selectSlot(selectedSlot.id);

  let readingState = selectedSlot.tab?.readingState;
  if (!readingState) {
    const newTab = seedBibleState.tabs.addTab();
    seedBibleState.tabsLayout.openTabInSlot(selectedSlot.id, newTab.id);
    readingState = newTab.readingState;
  }

  await readingState.selectTranslationAndChapter(
    translation,
    bookId,
    Number(chapter)
  );
}

async function addTwitchIcon({
  wsPaused,
  settingsOpened,
  isMobile,
}: {
  wsPaused: Signal<boolean>;
  settingsOpened: Signal<boolean>;
  isMobile: boolean;
}) {
  const container = !isMobile
    ? document.getElementsByClassName("sb-bible-reader-title")[0]
    : document.getElementsByClassName("sb-bible-reader-mobile-header-title")[0];
  if (!container) {
    console.error("Could not find container to add Twitch icon to");
    return;
  }

  document.getElementById("twitch-extension-icon")?.remove();

  const icon = document.createElement("div");
  icon.id = "twitch-extension-icon";
  icon.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${isMobile ? "24px" : "30px"};
    height: ${isMobile ? "24px" : "30px"};
    margin-left: 12px;
    border-radius: 50%;
    box-shadow: ${
      wsPaused.value
        ? "0px 1px 14px 0px rgba(0,0,0,0.1)"
        : "0px 1px 14px 0px color-mix(in srgb, var(--sb-primary-color) 25%, transparent)"
    };
    cursor: pointer;
  `;
  icon.onclick = (e) => {
    e.stopPropagation();
    settingsOpened.value = !settingsOpened.value;
  };

  container.appendChild(icon);
  render(
    <TwitchIcon width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} />,
    icon
  );
}

function expandRange(range: [number, number]): number[] {
  const [start, end] = range;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
