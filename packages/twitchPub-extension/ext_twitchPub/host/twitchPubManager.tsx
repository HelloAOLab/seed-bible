import { effect, signal, type Signal } from "@preact/signals";
import {
  fetchUserIds,
  checkAuthorizationStatus,
  getDeviceAuthUrl,
} from "ext_twitchPub.host.utils";
import { type TwitchPubState } from "ext_twitchPub.host.interface";
import { type SeedBibleState } from "seed-bible.app.api";
import sendMessage from "ext_twitchPub.host.sendMessage";

const sendAnnouncement = (
  accessToken: string,
  broadcasterId: string,
  moderatorId: string,
  message: string,
  clientId: string
) => {
  web
    .post(
      `https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
      JSON.stringify({ message, color: "purple" }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": clientId,
          "Content-Type": "application/json",
        },
      }
    )
    .then((e) => {
      console.log("Announcement sent successfully", e.data);
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
  const redirectUri = new URL(configBot.tags.url ?? "https://ao.bot/");
  redirectUri.search = "";
  redirectUri.searchParams.set(
    "pattern",
    configBot.tags.pattern || "SeedBible"
  );
  redirectUri.searchParams.set("autoinstall-ext_twitchSub", "true");

  const state = bytes.toBase64String(
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

export function CreateTwitchPubState(): TwitchPubState {
  /** manages twitch interface state */
  const interfaceEnabled = signal<boolean>(
    !!window.localStorage?.interfaceEnabled || false
  );
  const currentPage = signal<
    "login" | "authorization" | "interface" | "settings"
  >(window.localStorage?.currentPage || "login");
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
    announcementTimer: signal({
      enabled: savedSettings?.announcementTimer?.enabled ?? false,
      interval: savedSettings?.announcementTimer?.interval ?? 0,
    }),
  });
  let announcementTimerInterval: number | null = null;
  let uiHiddenTimeout: number | null = null;

  const deviceCode = signal<string | null>(
    window.localStorage?.deviceCode || null
  );
  const twitchConfig = signal({
    clientId: signal<string>("cfjslv2429r70ek579iogr02vecn6d"),
    channelId: signal<string>("1455265905"),
    broadcasterId: signal<string>(window.localStorage?.broadcasterId || ""),
    senderId: signal<string>(window.localStorage?.senderId || ""),
    userAccessToken: signal<string>(window.localStorage?.userAccessToken || ""),
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
      })
  );

  const setCurrentPage = (page: TwitchPubState["currentPage"]["value"]) => {
    currentPage.value = page;
  };

  const hideUI = () => {
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

    window.localStorage.setItem("prevSeedBibleState", JSON.stringify(current));
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
    const { broadcasterId, clientId, userAccessToken } = twitchConfig.value;
    if (
      !broadcasterId.value ||
      !clientId.value ||
      !userAccessToken.value ||
      !settings.value.highlight.value.enabled
    )
      return;
    sendAnnouncement(
      userAccessToken.value,
      broadcasterId.value,
      broadcasterId.value,
      `Join me at ${getUrl(twitchConfig.value)}`,
      clientId.value
    );
  });

  effect(() => {
    const { broadcasterId, clientId, userAccessToken } = twitchConfig.value;
    if (!broadcasterId.value || !clientId.value || !userAccessToken.value)
      return;
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
          clientId.value
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
        announcementTimer: settings.value.announcementTimer.value,
      })
    );
    window.localStorage.setItem(
      "interfaceEnabled",
      interfaceEnabled.value.toString()
    );
  });

  return {
    interfaceEnabled,
    twitchConfig,
    currentPage,
    deviceCode,
    loading,
    uiHidden,
    qrValue,
    getDeviceAuthUrl,
    settings,
    setCurrentPage,
    hideUI,
    showUI,
    handleSeedBibleUpdate,
    handleHighlightUpdate,
  };
}
