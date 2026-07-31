let websocketSessionID: string;

async function getAuth({ OAUTH_TOKEN }: { OAUTH_TOKEN: string }) {
  const response = await web.get("https://id.twitch.tv/oauth2/validate", {
    headers: {
      Authorization: "OAuth " + OAUTH_TOKEN,
    },
  });

  if (response.status != 200) {
    const data = await response.data;
    console.error("wsss:- " + data);
    return false;
  }
  return true;
}

function startWebSocketClient({
  EVENTSUB_WEBSOCKET_URL,
  BOT_USER_ID,
  OAUTH_TOKEN,
  CLIENT_ID,
  CHAT_CHANNEL_USER_ID,
}: {
  EVENTSUB_WEBSOCKET_URL: string;
  BOT_USER_ID: string;
  OAUTH_TOKEN: string;
  CLIENT_ID: string;
  CHAT_CHANNEL_USER_ID: string;
}) {
  const websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);

  websocketClient.onerror = (event) => {
    console.error("WebSocket error observed:", event);
  };

  websocketClient.onopen = () => {
    console.log("WebSocket connection opened to " + EVENTSUB_WEBSOCKET_URL);
  };

  websocketClient.onmessage = (event) => {
    handleWebSocketMessage({
      data: JSON.parse(event.data),
      BOT_USER_ID,
      OAUTH_TOKEN,
      CLIENT_ID,
      CHAT_CHANNEL_USER_ID,
    });
  };

  return websocketClient;
}

function handleWebSocketMessage({
  data,
  BOT_USER_ID,
  OAUTH_TOKEN,
  CLIENT_ID,
  CHAT_CHANNEL_USER_ID,
}: {
  data: any;
  BOT_USER_ID: string;
  OAUTH_TOKEN: string;
  CLIENT_ID: string;
  CHAT_CHANNEL_USER_ID: string;
}) {
  console.log("WebSocket message received:", data.metadata.message_type);
  switch (data.metadata.message_type) {
    case "session_welcome":
      websocketSessionID = data.payload.session.id;
      registerEventSubListeners({
        BOT_USER_ID,
        OAUTH_TOKEN,
        CLIENT_ID,
        CHAT_CHANNEL_USER_ID,
      });
      break;
    case "notification":
      switch (data.metadata.subscription_type) {
        case "channel.chat.message":
          console.log("WebSocket notification received:", data);
          try {
            const command = data.payload.event.message.text;
            if (command.startsWith("!")) {
              whisper(thisBot, "handleCommands", {
                chatterId: data.payload.event.chatter_user_id,
                chatterName: data.payload.event.chatter_user_name,
                command: command,
              });
            }
          } catch (e) {
            console.error("Failed to parse message text as JSON:", e);
          }

          break;
      }
      break;
  }
}

async function registerEventSubListeners({
  BOT_USER_ID,
  OAUTH_TOKEN,
  CLIENT_ID,
  CHAT_CHANNEL_USER_ID,
}: {
  BOT_USER_ID: string;
  OAUTH_TOKEN: string;
  CLIENT_ID: string;
  CHAT_CHANNEL_USER_ID: string;
}) {
  // Register channel.chat.message

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

const initializeTwitchBot = async ({
  BOT_USER_ID,
  OAUTH_TOKEN,
  CLIENT_ID,
  CHAT_CHANNEL_USER_ID,
}: {
  BOT_USER_ID: string;
  OAUTH_TOKEN: string;
  CLIENT_ID: string;
  CHAT_CHANNEL_USER_ID: string;
}) => {
  const isAuthValid = await getAuth({ OAUTH_TOKEN });
  if (!isAuthValid) {
    return;
  }

  const websocketClient = startWebSocketClient({
    EVENTSUB_WEBSOCKET_URL: "wss://eventsub.wss.twitch.tv/ws",
    BOT_USER_ID,
    OAUTH_TOKEN,
    CLIENT_ID,
    CHAT_CHANNEL_USER_ID,
  });
  return websocketClient;
};

export default initializeTwitchBot;
