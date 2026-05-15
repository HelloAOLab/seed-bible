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
  const settings = signal(
    window.localStorage.getItem("twitchSubSettings")
      ? JSON.parse(window.localStorage.getItem("twitchSubSettings") || "{}")
      : {
          translationEnabled: true,
          highlightEnabled: true,
          chapterFollowEnabled: true,
        }
  );
  const config = signal<TwitchSubInterface["config"]["value"]>(null);
  const websocketSessionID = signal(null);
  const webSocketClient = signal<WebSocket | null>(null);

  const settingsOpened = signal(false);

  effect(() => {
    getConfig({ clientId, eventSubWebsocketUrl }).then((configData) => {
      if (configData) {
        config.value = configData;
      }
    });
  });

  effect(() => {
    if (config.value) {
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
    if (config.value) {
      if (
        config.value.bookId &&
        config.value.chapter &&
        config.value.translation
      ) {
        openBookAndChapter(
          seedBibleState,
          config.value.translation,
          config.value.bookId,
          config.value.chapter
        );
        delete config.value.bookId;
        delete config.value.chapter;
        delete config.value.translation;
        window.localStorage.setItem(
          "twitchSubConfig",
          JSON.stringify(config.value)
        );
      }
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
            settings.value?.translationEnabled && followTranslation
              ? translation
              : seedBibleState.app.currentReadingState.value?.translationId ||
                  "ABB",
            settings.value?.chapterFollowEnabled
              ? bookId
              : seedBibleState.app.currentReadingState.value?.bookId || "GEN",
            settings.value?.chapterFollowEnabled
              ? chapter
              : seedBibleState.app.currentReadingState.value?.chapterNumber?.toString() ||
                  "1"
          );
          break;
        }
        case "highlightsChanged": {
          if (!settings.value.highlightEnabled) {
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
    const twitchSubContainer = document.getElementById("twitchSub-container");

    if (!twitchSubContainer && settingsOpened.value) {
      const twitchSubDiv = document.createElement("div");

      twitchSubDiv.id = "twitchSub-container";

      twitchSubDiv.className = "twitchSub";

      document.body.appendChild(twitchSubDiv);

      const container = document.getElementById("twitchSub-container");
      if (container) {
        render(
          <App
            wsPaused={wsPaused}
            settingsOpened={settingsOpened}
            settings={settings}
          />,
          container
        );
      }
    } else if (twitchSubContainer && !settingsOpened.value) {
      render(null, twitchSubContainer);
      twitchSubContainer.remove();
    }
  });

  effect(() => {
    window.localStorage.setItem(
      "twitchWebsocketClientPaused",
      wsPaused.value.toString()
    );
    window.localStorage.setItem(
      "twitchSubSettings",
      JSON.stringify(settings.value)
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
  if (window.localStorage.getItem("twitchSubConfig")) {
    try {
      const config = JSON.parse(
        window.localStorage.getItem("twitchSubConfig") || "{}"
      );

      return {
        ...config,
      };
    } catch (e) {
      console.error("Failed to parse Twitch Sub config from localStorage:", e);
      return null;
    }
  }

  const baseUrl = configBot.tags.url;

  const hash = new URLSearchParams(new URL(baseUrl).hash.slice(1));

  const accessToken = hash.get("access_token");

  const stateUnit8Array = bytes.fromBase64String(hash.get("state") || "");
  const stateString = new TextDecoder().decode(stateUnit8Array);
  if (!stateString) {
    console.error("No state found in URL hash. Full hash:", hash.toString());
    return null;
  }
  const state = JSON.parse(stateString) || {};
  const broadcasterId = state.broadcaster_id;
  const channelId = state.channel_id;
  const bookId = state.book;
  const chapter = state.chapter;
  const translation = state.translation;

  const res = await web.get("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });

  if (res.data.user_id) {
    const config = {
      botUserId: res.data.user_id,
      accessToken: accessToken,
      clientId: clientId,
      broadcasterId: broadcasterId,
      eventSubWebsocketUrl: eventSubWebsocketUrl,
      channelId: channelId,
      bookId: bookId,
      chapter: chapter,
      translation: translation,
    };
    window.localStorage.setItem("twitchSubConfig", JSON.stringify(config));
    os.goToURL(baseUrl.split("#")[0]);
    return null;
  } else {
    console.error("Failed to validate access token. Response:", res);
    return null;
  }
}

async function openBookAndChapter(
  seedBibleState: SeedBibleState,
  translation: string,
  bookId: string,
  chapter: string
) {
  const selectedPaneId = seedBibleState.panes.selectedPaneId.value;
  const selectedPane = seedBibleState.panes.panes.value.find(
    (pane) => pane.id === selectedPaneId
  );
  if (selectedPane) {
    seedBibleState.panes.selectPane(selectedPane.id);

    if (selectedPane.tab) {
      await selectedPane.tab.readingState.selectTranslationAndChapter(
        translation,
        bookId,
        Number(chapter)
      );
    } else {
      const newTab = seedBibleState.tabs.addTab();
      seedBibleState.panes.openInPane(selectedPane.id, {
        tabId: newTab.id,
      });

      await newTab.readingState.selectTranslationAndChapter(
        translation,
        bookId,
        Number(chapter)
      );
    }
  } else {
    console.error("No pane found with id:", selectedPaneId);
  }
}

function addTwitchIcon({
  wsPaused = signal(false),
  settingsOpened = signal(false),
}: {
  wsPaused: Signal<boolean>;
  settingsOpened: Signal<boolean>;
}) {
  const containerToUse =
    document.getElementsByClassName("sb-bible-reader-title")[0] ||
    document.getElementsByClassName("sb-bible-reader-mobile-header-title")[0] ||
    null;
  if (!containerToUse) {
    console.error("Could not find container to add Twitch icon to");
    return;
  }
  const existingIcon = document.getElementById("twitch-extension-icon");
  if (existingIcon) {
    existingIcon.remove();
  }
  const twitchIconDiv = document.createElement("div");
  twitchIconDiv.id = "twitch-extension-icon";
  twitchIconDiv.style = `
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

  console.log("Container to use for Twitch Icon:", containerToUse);

  twitchIconDiv.onclick = (e) => {
    e.stopPropagation();
    settingsOpened.value = !settingsOpened.value;
  };

  containerToUse.appendChild(twitchIconDiv);
  render(<TwitchIcon width={20} height={20} />, twitchIconDiv);
}

function expandRange(range: [number, number]): number[] {
  const [start, end] = range;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
