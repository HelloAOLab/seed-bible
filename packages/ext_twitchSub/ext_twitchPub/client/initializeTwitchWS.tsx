import getConfig from "ext_twitchPub.client.getConfig";

const {
  BOT_USER_ID,
  OAUTH_TOKEN,
  CLIENT_ID,
  CHAT_CHANNEL_USER_ID,
  EVENTSUB_WEBSOCKET_URL,
} = getConfig();

if (
  !BOT_USER_ID ||
  !OAUTH_TOKEN ||
  !CLIENT_ID ||
  !CHAT_CHANNEL_USER_ID ||
  !EVENTSUB_WEBSOCKET_URL
) {
  throw new Error(
    "Missing required configuration. Please ensure BOT_USER_ID, OAUTH_TOKEN, CLIENT_ID, CHAT_CHANNEL_USER_ID, and EVENTSUB_WEBSOCKET_URL are all set."
  );
}

let websocketSessionID: string;

async function getAuth() {
  const response = await web.get("https://id.twitch.tv/oauth2/validate", {
    headers: {
      Authorization: "OAuth " + OAUTH_TOKEN,
    },
  });

  if (response.status != 200) {
    const data = await response.data;
    console.error(
      "wsss:- " +
        "Token is not valid. /oauth2/validate returned status code " +
        response.status
    );
    console.error("wsss:- " + data);
    return false;
  }

  console.log("wsss:- " + "Validated token.");
  return true;
}

function startWebSocketClient() {
  const websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);

  websocketClient.onerror = (event) => {
    console.error("wsss:- " + "WebSocket error observed:", event);
  };

  websocketClient.onopen = () => {
    console.log(
      "wsss:- " + "WebSocket connection opened to " + EVENTSUB_WEBSOCKET_URL
    );
  };

  websocketClient.onmessage = (event) => {
    console.log("wsss:- " + "WebSocket message received:", event.data);
    handleWebSocketMessage(JSON.parse(event.data));
  };

  return websocketClient;
}
// data.payload.event.chatter_user_id
function handleWebSocketMessage(data: any) {
  console.log("wsss:- " + data.metadata.message_type);
  switch (data.metadata.message_type) {
    case "session_welcome": // First message you get from the WebSocket server when connecting
      // Listen to EventSub, which joins the chatroom from your bot's account
      websocketSessionID = data.payload.session.id;
      registerEventSubListeners();
      break;
    case "notification": // An EventSub notification has occurred, such as channel.chat.message
      switch (data.metadata.subscription_type) {
        case "channel.chat.message":
          // First, print the message to the program's console.
          console.log("wsss:- " + data);

          if (data.payload.event.chatter_user_id === BOT_USER_ID) {
            try {
              const config = JSON.parse(data.payload.event.message.text);
              whisper(thisBot, "handleEvents", {
                config: config,
              });
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

async function registerEventSubListeners() {
  // Register channel.chat.message

  console.log(
    "wsss:- " + BOT_USER_ID,
    OAUTH_TOKEN,
    CLIENT_ID,
    CHAT_CHANNEL_USER_ID,
    EVENTSUB_WEBSOCKET_URL
  );

  const response = await web.post(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: CHAT_CHANNEL_USER_ID,
        user_id: BOT_USER_ID,
      },
      transport: {
        method: "websocket",
        session_id: websocketSessionID,
      },
    }),
    {
      headers: {
        Authorization: "Bearer " + OAUTH_TOKEN,
        "Client-Id": CLIENT_ID,
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

const handleWS = async () => {
  const isAuthValid = await getAuth();
  if (!isAuthValid) {
    return;
  }

  startWebSocketClient();
  setTagMask(thisBot, "uiLoaded", true, "local");
};

handleWS();
