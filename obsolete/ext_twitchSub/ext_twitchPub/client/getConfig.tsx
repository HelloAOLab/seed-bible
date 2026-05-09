// export const BOT_USER_ID = "1455265905";
// export const OAUTH_TOKEN = "fbq3gxrrq9pvto7ao7jhqnlog5nv7r";
// export const CLIENT_ID = "rkp2fgvhgsi0fe7x62heitsim5zsw8";
// export const CHAT_CHANNEL_USER_ID = "1455265905";
// export const EVENTSUB_WEBSOCKET_URL = "wss://eventsub.wss.twitch.tv/ws";

const getConfig = () => {
  const BOT_USER_ID = String(
    masks?.broadcasterId || configBot.tags.broadcasterId
  );
  const OAUTH_TOKEN = String(masks?.token || configBot.tags.token);
  const CLIENT_ID = String(masks?.clientId || configBot.tags.clientId);
  const CHAT_CHANNEL_USER_ID = String(
    masks?.broadcasterId || configBot.tags.broadcasterId
  );
  const EVENTSUB_WEBSOCKET_URL = "wss://eventsub.wss.twitch.tv/ws";

  if (configBot.tags.broadcasterId) {
    setTagMask(thisBot, "broadcasterId", configBot.tags.broadcasterId, "local");
    configBot.tags.broadcasterId = null;
  }
  if (configBot.tags.token) {
    setTagMask(thisBot, "token", configBot.tags.token, "local");
    configBot.tags.token = null;
  }
  if (configBot.tags.clientId) {
    setTagMask(thisBot, "clientId", configBot.tags.clientId, "local");
    configBot.tags.clientId = null;
  }
  return {
    BOT_USER_ID,
    OAUTH_TOKEN,
    CLIENT_ID,
    CHAT_CHANNEL_USER_ID,
    EVENTSUB_WEBSOCKET_URL,
  };
};

export default getConfig;
