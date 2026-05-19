const getConfig = async () => {
  const CLIENT_ID = String("cfjslv2429r70ek579iogr02vecn6d");
  const EVENTSUB_WEBSOCKET_URL = "wss://eventsub.wss.twitch.tv/ws";

  if (masks?.BOT_USER_ID && masks?.OAUTH_TOKEN && masks?.CHAT_CHANNEL_USER_ID) {
    return {
      BOT_USER_ID: masks.BOT_USER_ID,
      OAUTH_TOKEN: masks.OAUTH_TOKEN,
      CLIENT_ID,
      CHAT_CHANNEL_USER_ID: masks.CHAT_CHANNEL_USER_ID,
      EVENTSUB_WEBSOCKET_URL,
      CHANNEL_ID: masks.CHANNEL_ID,
    };
  }

  const urlString = configBot.tags.url;

  const hash = new URLSearchParams(new URL(urlString).hash.slice(1));
  const accessToken = hash.get("access_token");

  const stateUnit8Array = bytes.fromBase64String(hash.get("state") || "");
  const stateString = new TextDecoder().decode(stateUnit8Array);
  console.log("Decoded state string from configBot.tags.state:", stateString);
  const state = JSON.parse(stateString) || {};
  const broadcasterId = state.broadcaster_id;
  const channelId = state.channel_id;

  const res = await web.get("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });

  if (res.data.user_id) {
    const bookId = state.book || "GEN";
    const chapter = state.chapter || 1;
    const translation = state.translation || "AAB";
    globalThis?.Open(bookId, chapter, translation);
    setTagMask(thisBot, "BOT_USER_ID", res.data.user_id, "local");
    setTagMask(thisBot, "OAUTH_TOKEN", accessToken, "local");
    setTagMask(thisBot, "CHAT_CHANNEL_USER_ID", broadcasterId, "local");
    setTagMask(thisBot, "CHANNEL_ID", channelId, "local");
    os.goToURL(urlString.split("#")[0]);
    return {
      BOT_USER_ID: res.data.user_id,
      OAUTH_TOKEN: accessToken,
      CLIENT_ID,
      CHAT_CHANNEL_USER_ID: broadcasterId,
      EVENTSUB_WEBSOCKET_URL,
      CHANNEL_ID: channelId,
    };
  } else {
    console.error("Failed to validate access token. Response:", res);
  }
};

export default getConfig;
