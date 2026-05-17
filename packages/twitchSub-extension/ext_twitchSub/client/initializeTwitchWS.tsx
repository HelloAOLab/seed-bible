import {
  type TwitchSubInterface,
  type WSTwitchMessage,
  type WSWelcomeMessage,
  type WSNotificationMessage,
} from "ext_twitchSub.client.interface";

interface ChannelChatMessageEvent {
  broadcaster_user_id: string;
  chatter_user_id: string;
  message: { text: string };
}

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
              const stateUnit8Array = bytes.fromBase64String(
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

  const response = await web.post(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    JSON.stringify({
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
    {
      headers: {
        Authorization: "Bearer " + config.accessToken.value!,
        "Client-Id": config.clientId.value!,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.status != 202) {
    const data = await response.data;
    console.error(
      "wsss:- " +
        "Failed to subscribe to channel.chat.message. API call returned status code " +
        response.status
    );
    console.error("wsss:- " + data);
  } else {
    const data = await response.data;
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
