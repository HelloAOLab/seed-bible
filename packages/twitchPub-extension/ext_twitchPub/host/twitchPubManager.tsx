import { effect, signal, type Signal } from "@preact/signals";
import {
  fetchUserIds,
  checkAuthorizationStatus,
  getDeviceAuthUrl,
  isTokenValid,
} from "./utils";
import { type TwitchPubState } from "./interface";
import { type SeedBibleState } from "seed-bible";
import sendMessage from "./sendMessage";
import { fromByteArray } from "base64-js";
import { v4 as uuid } from "uuid";
import { type TranscriptionManager } from "@seed-bible/ai-transcript-extension/transcriptionManager";
import type { Pane } from "seed-bible/managers";
import { pick } from "es-toolkit";

const sendAnnouncement = (
  accessToken: string,
  broadcasterId: string,
  moderatorId: string,
  message: string,
  clientId: string,
  onAuthError?: () => void
) => {
  fetch(
    `https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
    {
      method: "POST",
      body: JSON.stringify({ message, color: "purple" }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": clientId,
        "Content-Type": "application/json",
      },
    }
  )
    .then(async (e) => {
      // A 401 means the user access token has expired or been revoked.
      if (e.status === 401) {
        console.error("Twitch access token expired");
        onAuthError?.();
        return;
      }
      console.log("Announcement sent successfully", await e.json());
    })
    .catch((err) => {
      console.error("Failed to send announcement:", err);
    });
};

const getUrl = (
  config: {
    clientId: Signal<string>;
    broadcasterId: Signal<string>;
    channelId: Signal<string>;
  },
  {
    book = "GEN",
    chapter = 1,
    translation = "AAB",
  }: { book?: string; chapter?: number; translation?: string } = {}
) => {
  const redirectUri = new URL(location.href ?? "https://ao.bot/");
  redirectUri.search = "";
  // if (configBot.tags.pattern !== null) {
  //   redirectUri.searchParams.set("pattern", configBot.tags.pattern);
  // }
  redirectUri.searchParams.set("autoinstall-ext_twitchSub", "true");

  const state = fromByteArray(
    new TextEncoder().encode(
      JSON.stringify({
        broadcaster_id: config.broadcasterId.value,
        channel_id: config.channelId.value,
        book,
        chapter,
        translation,
      })
    )
  );
  const params = new URLSearchParams({
    client_id: config.clientId.value,
    redirect_uri: redirectUri.href,
    response_type: "token",
    scope: "user:read:chat user:bot channel:bot",
    state,
  });
  return `https://id.twitch.tv/oauth2/authorize?${params}`;
};

function createRateLimiter(
  send: (
    type: string,
    payload: string,
    parts: number,
    currentPart: number,
    uid: string
  ) => void
) {
  const CHUNK_SIZE = 350;
  const limit = 18,
    windowDuration = 30000,
    interval = 2000;
  const pending = new Map<string, string>();
  let messageCount = 0;
  let processing = false;
  let windowStart = Date.now();
  let lastSentTime = 0;

  function wait(ms: number) {
    return new Promise<void>((res) => setTimeout(res, ms));
  }

  async function checkRateLimit() {
    // Enforce minimum interval between any two sends
    const timeSinceLast = Date.now() - lastSentTime;
    if (lastSentTime > 0 && timeSinceLast < interval) {
      await wait(interval - timeSinceLast);
    }

    // Enforce window rate limit
    const elapsed = Date.now() - windowStart;
    if (elapsed >= windowDuration) {
      messageCount = 0;
      windowStart = Date.now();
    }
    if (messageCount >= limit) {
      await wait(windowDuration - (Date.now() - windowStart));
      messageCount = 0;
      windowStart = Date.now();
    }
  }

  async function processQueue() {
    if (processing) return;
    processing = true;

    while (pending.size > 0) {
      const [type, payload] = pending.entries().next().value as [
        string,
        string,
      ];
      pending.delete(type);

      const chunks: string[] = [];
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        chunks.push(payload.slice(i, i + CHUNK_SIZE));
      }
      const parts = chunks.length;
      const uid = uuid().slice(0, 5);

      for (let i = 0; i < parts; i++) {
        await checkRateLimit();
        send(type, chunks[i]!, parts, i, uid);
        lastSentTime = Date.now();
        messageCount++;
      }
    }

    processing = false;
  }

  return function enqueue(type: string, payload: string) {
    pending.set(type, payload);
    processQueue();
  };
}

export function CreateTwitchPubState({
  toast,
  transcriptionManager,
  seedBibleState,
}: {
  toast: (message: string) => void;
  transcriptionManager: TranscriptionManager;
  seedBibleState: SeedBibleState;
}): TwitchPubState {
  /** manages twitch interface state */
  const interfaceEnabled = signal<boolean>(
    window.localStorage?.interfaceEnabled === "true" || false
  );
  const currentPage = signal<
    "login" | "authorization" | "interface" | "settings"
  >(window.localStorage?.currentPage || "login");
  const currentPane = signal<Pane | null>(null);
  const loading = signal<boolean>(false);
  const uiHidden = signal<boolean>(false);
  const savedSettings = (() => {
    const raw = window.localStorage.getItem("settings");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();
  const settings = signal({
    translation: signal({
      enabled: savedSettings?.translation?.enabled ?? false,
    }),
    highlight: signal({ enabled: savedSettings?.highlight?.enabled ?? true }),
    aiFollow: signal({ enabled: savedSettings?.aiFollow?.enabled ?? false }),
    announcementTimer: signal({
      enabled: savedSettings?.announcementTimer?.enabled ?? false,
      interval: savedSettings?.announcementTimer?.interval ?? 0,
    }),
  });
  let announcementTimerInterval: number | null = null;
  let uiHiddenTimeout: number | null = null;
  const navigatingRef = signal<string | null>(null);
  let navMsgTimeout: number | null = null;

  const deviceCode = signal<string | null>(
    window.localStorage?.deviceCode || null
  );
  const twitchConfig = signal({
    clientId: signal<string>("cfjslv2429r70ek579iogr02vecn6d"),
    channelId: signal<string>("1455265905"),
    broadcasterId: signal<string>(window.localStorage?.broadcasterId),
    senderId: signal<string>(window.localStorage?.senderId),
    userAccessToken: signal<string>(window.localStorage?.userAccessToken),
  });

  const qrValue = signal<string>(getUrl(twitchConfig.value));

  const rateLimiter = createRateLimiter(
    (type, payload, parts, currentPart, uid) =>
      sendMessage({
        message: JSON.stringify({ type, parts, currentPart, payload, uid }),
        broadcasterId: twitchConfig.value.channelId.value,
        senderId: twitchConfig.value.senderId.value,
        userAccessToken: twitchConfig.value.userAccessToken.value,
        clientId: twitchConfig.value.clientId.value,
        onAuthError: handleAuthError,
      })
  );

  const setCurrentPage = (page: TwitchPubState["currentPage"]["value"]) => {
    currentPage.value = page;
  };

  const resetState = () => {
    window.localStorage.removeItem("clientId");
    window.localStorage.removeItem("currentPage");
    window.localStorage.removeItem("broadcasterId");
    window.localStorage.removeItem("senderId");
    window.localStorage.removeItem("userAccessToken");
    window.localStorage.removeItem("deviceCode");
    window.localStorage.removeItem("prevSeedBibleState");
    window.localStorage.removeItem("prevHighlights");
    setCurrentPage("login");
  };

  const handleAuthError = async () => {
    const token = twitchConfig.value.userAccessToken.value;
    if (!token || currentPage.value === "login") return;
    if (!(await isTokenValid(token))) {
      resetState();
    }
  };

  const hideUI = () => {
    if (seedBibleState.app.isMobile.value) return;
    if (uiHiddenTimeout) {
      clearTimeout(uiHiddenTimeout);
    }
    const st = setTimeout(() => {
      uiHidden.value = true;
    }, 4000);
    uiHiddenTimeout = st as unknown as number;
  };

  const showUI = () => {
    if (uiHiddenTimeout) {
      clearTimeout(uiHiddenTimeout);
    }
    uiHidden.value = false;
  };

  const handleSeedBibleUpdate = (seedBibleState: SeedBibleState) => {
    const { broadcasterId, clientId, userAccessToken } = twitchConfig.value;
    if (!broadcasterId.value || !clientId.value || !userAccessToken.value)
      return;

    const current = seedBibleState.app.currentReadingState.value;
    if (!current) return;

    const { translationId, bookId, chapterNumber } = current;
    const refInfo = window.localStorage.getItem("refInfo");
    if (refInfo) {
      return;
    }
    qrValue.value = getUrl(twitchConfig.value, {
      book: bookId || "GEN",
      chapter: chapterNumber || 1,
      translation: translationId || "AAB",
    });

    const baseUrl =
      seedBibleState.bibleData.api.endpoint || "https://vmfnri.helloao.org";
    const prevRaw = window.localStorage.getItem("prevSeedBibleState");
    const prev = prevRaw ? JSON.parse(prevRaw) : null;
    if (
      !prev ||
      translationId !== prev.translationId ||
      bookId !== prev.bookId ||
      chapterNumber !== prev.chapterNumber
    ) {
      rateLimiter(
        "bookChanged",
        JSON.stringify({
          translation: translationId,
          baseUrl,
          bookId,
          chapter: chapterNumber,
          followTranslation: settings.value.translation.value.enabled,
        })
      );
    }

    window.localStorage.setItem(
      "prevSeedBibleState",
      JSON.stringify(
        pick(current, ["translationId", "bookId", "chapterNumber"])
      )
    );
  };

  const handleHighlightUpdate = (
    highlights: {
      colorId: string;
      verse: number | [number, number];
      customColor?: string | undefined;
      customFontColor?: string | undefined;
    }[],
    bookId: string,
    chapterNumber: number
  ) => {
    const { broadcasterId, clientId, userAccessToken } = twitchConfig.value;
    if (
      !broadcasterId.value ||
      !clientId.value ||
      !userAccessToken.value ||
      !settings.value.highlight.value.enabled
    )
      return;

    const currentPayload = JSON.stringify({
      highlights: highlights.map(
        (h) =>
          `${bookId}:${chapterNumber}:${Array.isArray(h.verse) ? h.verse.join("-") : h.verse}:${h.colorId}${h.customColor ? `:${h.customColor}` : ""}${h.customFontColor ? `:${h.customFontColor}` : ""}`
      ),
    });
    const previous = window.localStorage.getItem("prevHighlights");
    if (currentPayload === previous) return;

    window.localStorage.setItem("prevHighlights", currentPayload);
    rateLimiter("highlightsChanged", currentPayload);
  };

  effect(() => {
    if (!!deviceCode.value && currentPage.value === "authorization") {
      checkAuthorizationStatus(
        twitchConfig.value.clientId.value,
        deviceCode.value,
        twitchConfig.value.userAccessToken,
        currentPage
      );
    } else if (
      !!twitchConfig.value.userAccessToken.value &&
      currentPage.value === "interface"
    ) {
      fetchUserIds(
        twitchConfig.value.clientId.value,
        twitchConfig.value.userAccessToken.value,
        twitchConfig.value.broadcasterId,
        twitchConfig.value.senderId
      );
    }
  });

  effect(() => {
    const { broadcasterId, clientId, userAccessToken, senderId } =
      twitchConfig.value;
    if (
      !broadcasterId.value ||
      !clientId.value ||
      !userAccessToken.value ||
      !senderId.value ||
      !settings.value.highlight.value.enabled
    )
      return;
    sendAnnouncement(
      userAccessToken.value,
      broadcasterId.value,
      broadcasterId.value,
      `Join me at ${getUrl(twitchConfig.value)}`,
      clientId.value,
      handleAuthError
    );
  });

  effect(() => {
    const { broadcasterId, clientId, userAccessToken, senderId } =
      twitchConfig.value;
    if (
      !broadcasterId.value ||
      !clientId.value ||
      !userAccessToken.value ||
      !senderId.value
    ) {
      return;
    }
    if (settings.value.announcementTimer.value.interval > 0) {
      if (announcementTimerInterval) {
        clearInterval(announcementTimerInterval);
      }
      const interval = settings.value.announcementTimer.value.interval;
      const st = setInterval(() => {
        sendAnnouncement(
          userAccessToken.value,
          broadcasterId.value,
          broadcasterId.value,
          `Join me at ${getUrl(twitchConfig.value)}`,
          clientId.value,
          handleAuthError
        );
      }, interval);
      announcementTimerInterval = st as unknown as number;
    } else {
      if (announcementTimerInterval) {
        clearInterval(announcementTimerInterval);
        announcementTimerInterval = null;
      }
    }
  });

  effect(() => {
    window.localStorage.setItem("clientId", twitchConfig.value.clientId.value);
    window.localStorage.setItem("currentPage", currentPage.value);
    window.localStorage.setItem("deviceCode", deviceCode.value || "");
    window.localStorage.setItem(
      "userAccessToken",
      twitchConfig.value.userAccessToken.value
    );
    window.localStorage.setItem("senderId", twitchConfig.value.senderId.value);
    window.localStorage.setItem(
      "broadcasterId",
      twitchConfig.value.broadcasterId.value
    );
    window.localStorage.setItem(
      "settings",
      JSON.stringify({
        translation: settings.value.translation.value,
        highlight: settings.value.highlight.value,
        aiFollow: settings.value.aiFollow.value,
        announcementTimer: settings.value.announcementTimer.value,
      })
    );
    window.localStorage.setItem(
      "interfaceEnabled",
      interfaceEnabled.value.toString()
    );
  });

  const initializeAITranscription = async () => {
    const { login } = seedBibleState;
    if (
      settings.value.aiFollow.value.enabled &&
      transcriptionManager &&
      interfaceEnabled.value
    ) {
      if (login.userId.value) {
        transcriptionManager.askForDonation();
        transcriptionManager.mode.value = "live";
        await transcriptionManager.startLive();
      } else {
        const userInfo = await login.login().catch(() => {
          settings.value.aiFollow.value = {
            ...settings.value.aiFollow.value,
            enabled: false,
          };
        });
        if (!userInfo) {
          settings.value.aiFollow.value = {
            ...settings.value.aiFollow.value,
            enabled: false,
          };
          return;
        }
      }
    } else if (transcriptionManager) {
      transcriptionManager.stopLive();
    }
  };

  effect(() => {
    initializeAITranscription();
  });

  async function highlightRefVerse(
    seedBibleState: SeedBibleState,
    ref: string,
    interval = 5000
  ): Promise<void> {
    const [book, chapter, verse] = ref.split(":");

    const selectedTabId = seedBibleState.tabs.selectedTabId;
    let selectedTab = seedBibleState.tabs.tabs.value.find(
      (tab) => tab.id === selectedTabId.value
    );

    const currentReadingState = seedBibleState.app.currentReadingState.value;

    if (selectedTab && book) {
      const { bookId, chapterNumber } = selectedTab.readingState;

      window.localStorage.setItem("refInfo", JSON.stringify({ book, chapter }));

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
        rateLimiter(
          "refHighlight",
          JSON.stringify({
            bookId: book,
            chapter: Number(chapter),
            verse: Number(verse),
          })
        );
      }
      setTimeout(() => {
        window.localStorage.removeItem("refInfo");
      }, 2000);
    }
  }

  effect(() => {
    if (
      settings.value.aiFollow.value.enabled &&
      transcriptionManager &&
      transcriptionManager.liveSegments.value.length > 0
    ) {
      const latestSegment =
        transcriptionManager.liveSegments.value[
          transcriptionManager.liveSegments.value.length - 1
        ];
      const latestRef = latestSegment?.references[0] || null;
      if (latestRef) {
        navigatingRef.value = latestRef;
        if (navMsgTimeout) clearTimeout(navMsgTimeout);
        navMsgTimeout = setTimeout(() => {
          navigatingRef.value = null;
          highlightRefVerse(seedBibleState, latestRef, 5000).catch((err) => {
            console.error("Error highlighting verse:", err);
          });
        }, 2000) as unknown as number;
      }
    }
  });

  return {
    interfaceEnabled,
    navigatingRef,
    twitchConfig,
    currentPage,
    deviceCode,
    loading,
    uiHidden,
    qrValue,
    currentPane,
    seedBibleState,
    getDeviceAuthUrl,
    settings,
    setCurrentPage,
    hideUI,
    showUI,
    handleSeedBibleUpdate,
    handleHighlightUpdate,
    toast,
    resetState,
  };
}
