import {
  type TwitchSubInterface,
  type WSTwitchMessage,
  type WSWelcomeMessage,
  type WSNotificationMessage,
} from "./interface";
import { toByteArray } from "base64-js";

interface ChannelChatMessageEvent {
  broadcaster_user_id: string;
  chatter_user_id: string;
  message: { text: string };
}

const RECONNECT_DELAY_MS = 1000;

function startWebSocketClient(twitchSubManager: TwitchSubInterface) {
  const config = twitchSubManager.config.value;
  if (!config.accessToken.value) {
    console.error("wsss:- Twitch config not available.");
    return;
  }
  const websocketClient = new WebSocket(config.eventSubWebsocketUrl.value!);

  websocketClient.onerror = (event) => {
    console.error("wsss:- " + "WebSocket error observed:", event);
  };

  websocketClient.onopen = () => {
    console.log(
      "wsss:- " +
        "WebSocket connection opened to " +
        config.eventSubWebsocketUrl.value
    );
  };

  websocketClient.onmessage = (event) => {
    handleWebSocketMessage(JSON.parse(event.data), twitchSubManager);
  };

  websocketClient.onclose = (event) => {
    console.warn(
      "wsss:- " +
        `WebSocket connection closed (code: ${event.code}, reason: ${event.reason || "none"}). Restarting...`
    );

    twitchSubManager.webSocketClient.value = null;
    twitchSubManager.websocketSessionID.value = null;

    setTimeout(() => {
      if (!twitchSubManager.config.value.accessToken.value) {
        return;
      }
      startWebSocketClient(twitchSubManager);
    }, RECONNECT_DELAY_MS);
  };

  twitchSubManager.webSocketClient.value = websocketClient;
}

function handleWebSocketMessage(
  data: WSTwitchMessage,
  twitchSubManager: TwitchSubInterface
) {
  const config = twitchSubManager.config.value;
  if (!config.accessToken.value) {
    console.error("wsss:- Twitch config not available.");
    return;
  }
  console.log("wsss:- " + "WebSocket message received:", data);
  switch (data.metadata.message_type) {
    case "session_welcome": {
      const welcome = data as WSWelcomeMessage;
      twitchSubManager.websocketSessionID.value = welcome.payload.session.id;
      registerEventSubListeners(twitchSubManager);
      break;
    }
    case "notification": {
      const notification =
        data as unknown as WSNotificationMessage<ChannelChatMessageEvent>;
      switch (notification.metadata.subscription_type) {
        case "channel.chat.message":
          if (
            notification.payload.event.broadcaster_user_id ===
              config.channelId.value &&
            notification.payload.event.chatter_user_id ===
              config.broadcasterId.value
          ) {
            try {
              const stateUnit8Array = toByteArray(
                notification.payload.event.message.text || ""
              );
              const configString = new TextDecoder().decode(stateUnit8Array);
              const parsedConfig = JSON.parse(configString);
              twitchSubManager.handleWSEvents(parsedConfig);
            } catch (e) {
              console.error(
                "wsss:- " + "Failed to parse message text as JSON:",
                e
              );
            }
          }
          break;
      }
      break;
    }
  }
}

async function registerEventSubListeners(twitchSubManager: TwitchSubInterface) {
  const config = twitchSubManager.config.value;
  if (!config.accessToken.value) {
    console.error("wsss:- Twitch config not available.");
    return;
  }

  const response = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        type: "channel.chat.message",
        version: "1",
        condition: {
          broadcaster_user_id: config.channelId.value!,
          user_id: config.botUserId.value!,
        },
        transport: {
          method: "websocket",
          session_id: twitchSubManager.websocketSessionID.value,
        },
      }),
      headers: {
        Authorization: "Bearer " + config.accessToken.value!,
        "Client-Id": config.clientId.value!,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.status != 202) {
    const data = await response.json();
    console.error(
      "wsss:- " +
        "Failed to subscribe to channel.chat.message. API call returned status code " +
        response.status
    );
    console.error("wsss:- " + data);
  } else {
    const data = await response.json();
    console.log(
      "wsss:- " + `Subscribed to channel.chat.message [${data.data[0].id}]`
    );
  }
}

export async function initializeTwitchWS(twitchSubManager: TwitchSubInterface) {
  const config = twitchSubManager.config.value;

  if (!config) {
    console.error("wsss:- Twitch config not available.");
    return;
  } else {
    startWebSocketClient(twitchSubManager);
  }
}
