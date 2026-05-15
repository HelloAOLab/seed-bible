import { effect, signal } from "@preact/signals";
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

const getUrl = (props: {
  clientId: string;
  broadcasterId: string;
  channelId: string;
  book?: string;
  chapter?: number;
  translation?: string;
}) => {
  const {
    clientId,
    broadcasterId,
    channelId,
    book = "GEN",
    chapter = 1,
    translation = "AAB",
  } = props;
  const redirectUri = `https://ao.bot/?pattern=${configBot.tags.pattern || "SeedBible"}&ext_twitchSub=true`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: "user:read:chat user:bot channel:bot",
    state: bytes.toBase64String(
      new Uint8Array(
        [
          ...JSON.stringify({
            broadcaster_id: broadcasterId,
            channel_id: channelId,
            book,
            chapter,
            translation,
          }),
        ].map((c) => c.charCodeAt(0))
      )
    ),
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
  const settings = signal({
    translation: {
      enabled: false,
    },
    highlight: {
      enabled: true,
    },
    announcementTimer: {
      enabled: false,
      interval: 0,
    },
  });
  let announcementTimerInterval: number | null = null;
  let uiHiddenTimeout: number | null = null;

  const clientId = signal<string>("cfjslv2429r70ek579iogr02vecn6d");
  const channelId = signal<string>("1455265905");
  const deviceCode = signal<string | null>(
    window.localStorage?.deviceCode || null
  );
  const userAccessToken = signal<string | null>(
    window.localStorage?.userAccessToken || null
  );
  const senderId = signal<string | null>(window.localStorage?.senderId || null);
  const broadcasterId = signal<string | null>(
    window.localStorage?.broadcasterId || null
  );
  const qrValue = signal<string>(
    getUrl({
      clientId: clientId.value,
      broadcasterId: broadcasterId.value || "",
      channelId: channelId.value,
    })
  );
  const rateLimiter = createRateLimiter(
    (type, payload, parts, currentPart, uid) =>
      sendMessage({
        message: JSON.stringify({
          type,
          parts,
          currentPart,
          payload,
          uid,
        }),
        broadcasterId: channelId.value,
        senderId: senderId.value!,
        userAccessToken: userAccessToken.value!,
        clientId: clientId.value,
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
    const bId = broadcasterId.value;
    const cId = clientId.value;
    const uat = userAccessToken.value;
    if (!bId || !cId || !uat) {
      console.warn("Missing Twitch credentials, cannot send announcement");
      return;
    }
    console.log("Handling Seed Bible bookUpdate");

    const current = seedBibleState.app.currentReadingState.value;
    if (!current) return;

    const { translationId, bookId, chapterNumber } = current;
    qrValue.value = getUrl({
      clientId: clientId.value,
      broadcasterId: broadcasterId.value || "",
      channelId: channelId.value,
      book: bookId || "GEN",
      chapter: chapterNumber || 1,
      translation: translationId || "AAB",
    });
    const baseUrl =
      seedBibleState.bibleData.api.endpoint || "https://vmfnri.helloao.org";
    const prev = window.localStorage?.prevSeedBibleState
      ? JSON.parse(window.localStorage.prevSeedBibleState)
      : null;
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
          followTranslation: settings.value.translation.enabled,
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
    const bId = broadcasterId.value;
    const cId = clientId.value;
    const uat = userAccessToken.value;
    if (!bId || !cId || !uat || !settings.value.highlight.enabled) {
      console.warn("Missing Twitch credentials, cannot send announcement");
      return;
    }
    const currentPayload = JSON.stringify({
      highlights: highlights.map(
        (h) =>
          `${bookId}:${chapterNumber}:${Array.isArray(h.verse) ? h.verse.join("-") : h.verse}:${h.colorId}${h.customColor ? `:${h.customColor}` : ""}${h.customFontColor ? `:${h.customFontColor}` : ""}`
      ),
    });
    const previous = window.localStorage?.prevHighlights || null;
    if (currentPayload === previous) {
      console.log("Highlights unchanged, not sending update");
      return;
    }
    window.localStorage.setItem("prevHighlights", currentPayload);
    rateLimiter("highlightsChanged", currentPayload);
  };

  effect(() => {
    if (!!deviceCode.value && currentPage.value === "authorization") {
      checkAuthorizationStatus(
        clientId.value,
        deviceCode.value,
        userAccessToken,
        currentPage
      );
    } else if (!!userAccessToken.value && currentPage.value === "interface") {
      fetchUserIds(
        clientId.value,
        userAccessToken.value,
        broadcasterId,
        senderId
      );
    }
  });

  effect(() => {
    const bId = broadcasterId.value;
    const cId = clientId.value;
    const uat = userAccessToken.value;
    if (!bId || !cId || !uat) return;
    sendAnnouncement(
      uat,
      bId,
      bId,
      `Join me at ${getUrl({ clientId: clientId.value, broadcasterId: broadcasterId.value || "", channelId: channelId.value, book: "GEN", chapter: 1, translation: "AAB" })}`,
      cId
    );
  });

  effect(() => {
    const bId = broadcasterId.value;
    const cId = clientId.value;
    const uat = userAccessToken.value;
    if (!bId || !cId || !uat) return;
    console.log(
      settings.value.announcementTimer,
      "announcement timer settings"
    );
    if (settings.value.announcementTimer.interval > 0) {
      if (announcementTimerInterval) {
        clearInterval(announcementTimerInterval);
      }
      const interval = settings.value.announcementTimer.interval;
      const st = setInterval(() => {
        console.log("Sending scheduled announcement with Twitch credentials:", {
          bId,
          cId,
          uat,
          interval,
        });
        sendAnnouncement(
          uat,
          bId,
          bId,
          `Join me at ${getUrl({ clientId: clientId.value, broadcasterId: broadcasterId.value || "", channelId: channelId.value, book: "GEN", chapter: 1, translation: "AAB" })}`,
          cId
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
    window.localStorage.setItem("clientId", clientId.value);
    window.localStorage.setItem("currentPage", currentPage.value);
    window.localStorage.setItem("deviceCode", deviceCode.value || "");
    window.localStorage.setItem("userAccessToken", userAccessToken.value || "");
    window.localStorage.setItem("senderId", senderId.value || "");
    window.localStorage.setItem("broadcasterId", broadcasterId.value || "");
    window.localStorage.setItem("settings", JSON.stringify(settings.value));
    window.localStorage.setItem(
      "interfaceEnabled",
      interfaceEnabled.value.toString()
    );
  });

  return {
    interfaceEnabled,
    clientId,
    currentPage,
    deviceCode,
    userAccessToken,
    senderId,
    broadcasterId,
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
