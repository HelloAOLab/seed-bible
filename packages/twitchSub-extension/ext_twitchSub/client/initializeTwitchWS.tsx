import { type TwitchSubInterface } from "ext_twitchSub.client.interface";

function startWebSocketClient(twitchSubManager: TwitchSubInterface) {
  const config = twitchSubManager.config.value;
  if (!config) {
    console.error("wsss:- Twitch config not available.");
    return;
  }
  const websocketClient = new WebSocket(config.eventSubWebsocketUrl);

  websocketClient.onerror = (event) => {
    console.error("wsss:- " + "WebSocket error observed:", event);
  };

  websocketClient.onopen = () => {
    console.log(
      "wsss:- " +
        "WebSocket connection opened to " +
        config.eventSubWebsocketUrl
    );
  };

  websocketClient.onmessage = (event) => {
    handleWebSocketMessage(JSON.parse(event.data), twitchSubManager);
  };

  twitchSubManager.webSocketClient.value = websocketClient;
}

function handleWebSocketMessage(
  data: any,
  twitchSubManager: TwitchSubInterface
) {
  const config = twitchSubManager.config.value;
  if (!config) {
    console.error("wsss:- Twitch config not available.");
    return;
  }
  console.log("wsss:- " + "WebSocket message received:", data);
  switch (data.metadata.message_type) {
    case "session_welcome":
      twitchSubManager.websocketSessionID.value = data.payload.session.id;
      registerEventSubListeners(twitchSubManager);
      break;
    case "notification":
      switch (data.metadata.subscription_type) {
        case "channel.chat.message":
          if (
            data.payload.event.broadcaster_user_id === config.channelId &&
            data.payload.event.chatter_user_id === config.broadcasterId
          ) {
            try {
              console.log(
                "wsss:- " +
                  "Received chat message from broadcaster. Processing..."
              );
              const stateUnit8Array = bytes.fromBase64String(
                data.payload.event.message.text || ""
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

async function registerEventSubListeners(twitchSubManager: TwitchSubInterface) {
  const config = twitchSubManager.config.value;
  if (!config) {
    console.error("wsss:- Twitch config not available.");
    return;
  }

  const response = await web.post(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: config.channelId,
        user_id: config.botUserId,
      },
      transport: {
        method: "websocket",
        session_id: twitchSubManager.websocketSessionID.value,
      },
    }),
    {
      headers: {
        Authorization: "Bearer " + config.accessToken,
        "Client-Id": config.clientId,
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
