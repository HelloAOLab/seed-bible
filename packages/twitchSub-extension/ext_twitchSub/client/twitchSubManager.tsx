import App from "ext_twitchSub.client.App";
import { TwitchIcon } from "ext_twitchSub.client.icons";
import { initializeTwitchWS } from "ext_twitchSub.client.initializeTwitchWS";
import { signal, effect, type Signal } from "@preact/signals";
import { type TwitchSubInterface } from "ext_twitchSub.client.interface";
import { type SeedBibleState } from "seed-bible.app.api";
const { render } = os.appHooks;

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

  const wsPaused = signal(
    getBooleanMaskValue(
      window.localStorage.getItem("twitchWebsocketClientPaused"),
      false
    )
  );
  const savedSettings = window.localStorage.getItem("twitchSubSettings")
    ? JSON.parse(window.localStorage.getItem("twitchSubSettings") || "{}")
    : {
        translationEnabled: true,
        highlightEnabled: true,
        chapterFollowEnabled: true,
      };
  const settings = signal({
    translationEnabled: signal<boolean>(
      savedSettings.translationEnabled ?? true
    ),
    highlightEnabled: signal<boolean>(savedSettings.highlightEnabled ?? true),
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
    getConfig({ clientId, eventSubWebsocketUrl }).then((configData) => {
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
      window.localStorage.setItem(
        "twitchSubConfig",
        JSON.stringify(config.value)
      );
    }
  });

  effect(() => {
    if (
      websocketSessionID.value &&
      webSocketClient.value &&
      seedBibleState.app.currentReadingState.value
    ) {
      addTwitchIcon({ wsPaused, settingsOpened });
    }
  });

  const handleWSEvents = async (config: { type: string; payload: string }) => {
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
        }
      }
    }
  };

  effect(() => {
    if (settingsOpened.value) {
      if (document.getElementById("twitchSub-container")) return;

      const container = document.createElement("div");
      container.id = "twitchSub-container";
      container.className = "twitchSub";
      document.body.appendChild(container);

      render(
        <App
          wsPaused={wsPaused}
          settingsOpened={settingsOpened}
          settings={settings}
        />,
        container
      );
    } else {
      const container = document.getElementById("twitchSub-container");
      if (container) {
        render(null, container);
        container.remove();
      }
    }
  });

  effect(() => {
    window.localStorage.setItem(
      "twitchWebsocketClientPaused",
      wsPaused.value.toString()
    );
    window.localStorage.setItem(
      "twitchSubSettings",
      JSON.stringify({
        translationEnabled: settings.value.translationEnabled.value,
        highlightEnabled: settings.value.highlightEnabled.value,
        chapterFollowEnabled: settings.value.chapterFollowEnabled.value,
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
  };
}

async function getConfig({
  clientId,
  eventSubWebsocketUrl,
}: {
  clientId: string;
  eventSubWebsocketUrl: string;
}) {
  const stored = window.localStorage.getItem("twitchSubConfig");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse Twitch Sub config from localStorage:", e);
      return null;
    }
  }

  const baseUrl = configBot.tags.url;
  const hash = new URLSearchParams(new URL(baseUrl).hash.slice(1));

  const accessToken = hash.get("access_token");
  if (!accessToken) {
    console.error("No access token found in URL hash.");
    return null;
  }

  const stateBytes = bytes.fromBase64String(hash.get("state") || "");
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

  const res = await web.get("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });

  if (!res.data.user_id) {
    console.error("Failed to validate access token. Response:", res);
    return null;
  }

  const config = {
    botUserId: res.data.user_id,
    accessToken,
    clientId,
    broadcasterId,
    eventSubWebsocketUrl,
    channelId,
    bookId,
    chapter,
    translation,
  };
  window.localStorage.setItem("twitchSubConfig", JSON.stringify(config));

  if (posthog) {
    posthog.capture("twitch_sub_client_joined", {});
  }

  os.goToURL(baseUrl.split("#")[0]);
  return null;
}

async function openBookAndChapter(
  seedBibleState: SeedBibleState,
  translation: string,
  bookId: string,
  chapter: string
) {
  const selectedPane = seedBibleState.panes.panes.value.find(
    (pane) => pane.id === seedBibleState.panes.selectedPaneId.value
  );
  if (!selectedPane) {
    console.error(
      "No pane found with id:",
      seedBibleState.panes.selectedPaneId.value
    );
    return;
  }

  seedBibleState.panes.selectPane(selectedPane.id);

  let readingState = selectedPane.tab?.readingState;
  if (!readingState) {
    const newTab = seedBibleState.tabs.addTab();
    seedBibleState.panes.openInPane(selectedPane.id, { tabId: newTab.id });
    readingState = newTab.readingState;
  }

  await readingState.selectTranslationAndChapter(
    translation,
    bookId,
    Number(chapter)
  );
}

function addTwitchIcon({
  wsPaused,
  settingsOpened,
}: {
  wsPaused: Signal<boolean>;
  settingsOpened: Signal<boolean>;
}) {
  const container =
    document.getElementsByClassName("sb-bible-reader-title")[0] ??
    document.getElementsByClassName("sb-bible-reader-mobile-header-title")[0];
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
    width: 30px;
    height: 30px;
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
  render(<TwitchIcon width={20} height={20} />, icon);
}

function expandRange(range: [number, number]): number[] {
  const [start, end] = range;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
