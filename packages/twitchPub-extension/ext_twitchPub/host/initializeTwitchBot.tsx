import { type Signal } from "@preact/signals";
import sendMessage from "ext_twitchPub.host.sendMessage";

const TWITCH_VALIDATE_URL = "https://id.twitch.tv/oauth2/validate";
const TWITCH_EVENTSUB_WS_URL = "wss://eventsub.wss.twitch.tv/ws";
const TWITCH_EVENTSUB_SUBSCRIPTIONS_URL =
  "https://api.twitch.tv/helix/eventsub/subscriptions";

type TwitchBotConfig = {
  BOT_USER_ID: string;
  OAUTH_TOKEN: string;
  CLIENT_ID: string;
  CHAT_CHANNEL_USER_ID: string;
  QR_VALUE: string;
};

type WebSocketMessage = {
  metadata?: {
    message_type?: string;
    subscription_type?: string;
  };
  payload?: unknown;
};

let websocketSessionID: string;

function getOauthHeaders(token: string) {
  return {
    Authorization: "OAuth " + token,
  };
}

function getBearerHeaders(token: string, clientId: string) {
  return {
    Authorization: "Bearer " + token,
    "Client-Id": clientId,
    "Content-Type": "application/json",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSessionIdFromMessage(data: WebSocketMessage): string | null {
  if (!isRecord(data.payload)) {
    return null;
  }
  const session = data.payload.session;
  if (!isRecord(session)) {
    return null;
  }
  return typeof session.id === "string" ? session.id : null;
}

const handleCommands = (props: {
  command: string;
  chatterName: string;
  state: {
    broadcasterId: string;
    senderId: string;
    userAccessToken: string;
    clientId: string;
    qrValue: string;
  };
}) => {
  const { command, chatterName, state } = props;
  switch (command) {
    case "!givelink":
      sendMessage({
        message: `Hi ${chatterName}! Here's your link to access the content on your device: ${state.qrValue}`,
        broadcasterId: state.broadcasterId,
        senderId: state.senderId,
        userAccessToken: state.userAccessToken,
        clientId: state.clientId,
        encriptMessage: false,
      });
      break;
    case "!help": {
      const commandsList = `Hi ${chatterName}! Here's a list of available commands:\n!givelink - Receive the link to access the content on your device.\n!help - List of available commands.`;
      sendMessage({
        message: commandsList,
        broadcasterId: state.broadcasterId,
        senderId: state.senderId,
        userAccessToken: state.userAccessToken,
        clientId: state.clientId,
        encriptMessage: false,
      });
      break;
    }
    default:
      sendMessage({
        message: `Sorry ${chatterName}, I didn't recognize that command. Type !help for a list of available commands.`,
        broadcasterId: state.broadcasterId,
        senderId: state.senderId,
        userAccessToken: state.userAccessToken,
        clientId: state.clientId,
        encriptMessage: false,
      });
  }
};

function getChatEventFromMessage(data: WebSocketMessage): {
  text: string;
  chatterId: string;
  chatterName: string;
} | null {
  if (!isRecord(data.payload)) {
    return null;
  }
  const event = data.payload.event;
  if (!isRecord(event)) {
    return null;
  }
  const message = event.message;
  if (!isRecord(message)) {
    return null;
  }

  const text = message.text;
  const chatterId = event.chatter_user_id;
  const chatterName = event.chatter_user_name;
  if (
    typeof text !== "string" ||
    typeof chatterId !== "string" ||
    typeof chatterName !== "string"
  ) {
    return null;
  }

  return {
    text,
    chatterId,
    chatterName,
  };
}

async function getAuth({ OAUTH_TOKEN }: Pick<TwitchBotConfig, "OAUTH_TOKEN">) {
  const response = await web.get(TWITCH_VALIDATE_URL, {
    headers: getOauthHeaders(OAUTH_TOKEN),
  });

  if (response.status !== 200) {
    return false;
  }
  return true;
}

function handleChatMessageNotification(
  data: WebSocketMessage,
  state: {
    broadcasterId: string;
    senderId: string;
    userAccessToken: string;
    clientId: string;
    qrValue: string;
  }
) {
  const chatEvent = getChatEventFromMessage(data);
  if (chatEvent?.text.startsWith("!")) {
    handleCommands({
      chatterName: chatEvent.chatterName,
      command: chatEvent.text,
      state,
    });
  }
}

function startWebSocketClient(state: {
  broadcasterId: string;
  senderId: string;
  userAccessToken: string;
  clientId: string;
  qrValue: string;
}) {
  const websocketClient = new WebSocket(TWITCH_EVENTSUB_WS_URL);

  websocketClient.onerror = (event) => {
    console.error("WebSocket error observed:", event);
  };

  websocketClient.onopen = () => {
    console.log("WebSocket connection opened to " + TWITCH_EVENTSUB_WS_URL);
  };

  websocketClient.onmessage = (event) => {
    try {
      handleWebSocketMessage({
        data: JSON.parse(event.data),
        state: {
          broadcasterId: state.broadcasterId,
          senderId: state.senderId,
          userAccessToken: state.userAccessToken,
          clientId: state.clientId,
          qrValue: state.qrValue,
        },
      });
    } catch (error) {
      console.error("Failed to parse WebSocket message payload:", error);
    }
  };

  return websocketClient;
}

function handleWebSocketMessage({
  data,
  state,
}: {
  data: WebSocketMessage;
  state: {
    broadcasterId: string;
    senderId: string;
    userAccessToken: string;
    clientId: string;
    qrValue: string;
  };
}) {
  const messageType = data.metadata?.message_type;

  if (messageType === "session_welcome") {
    const sessionId = getSessionIdFromMessage(data);
    if (!sessionId) {
      console.error("WebSocket welcome message missing session id.");
      return;
    }
    websocketSessionID = sessionId;
    registerEventSubListeners({
      state,
    });
    return;
  }

  if (
    messageType === "notification" &&
    data.metadata?.subscription_type === "channel.chat.message"
  ) {
    handleChatMessageNotification(data, state);
  }
}

async function registerEventSubListeners({
  state,
}: {
  state: {
    broadcasterId: string;
    senderId: string;
    userAccessToken: string;
    clientId: string;
    qrValue: string;
  };
}) {
  const { senderId, broadcasterId } = state;
  const payload = {
    type: "channel.chat.message",
    version: "1",
    condition: {
      broadcaster_user_id: broadcasterId,
      user_id: senderId,
    },
    transport: {
      method: "websocket",
      session_id: websocketSessionID,
    },
  };

  const response = await web.post(
    TWITCH_EVENTSUB_SUBSCRIPTIONS_URL,
    JSON.stringify(payload),
    {
      headers: getBearerHeaders(state.userAccessToken!, state.clientId!),
    }
  );

  if (response.status !== 202) {
    return;
  }
}

const initializeTwitchBot = async (state: {
  broadcasterId: Signal<string | null>;
  senderId: Signal<string | null>;
  userAccessToken: Signal<string | null>;
  clientId: Signal<string>;
  qrValue: Signal<string>;
}) => {
  const isAuthValid = await getAuth({
    OAUTH_TOKEN: state.userAccessToken.value!,
  });
  if (!isAuthValid) {
    return;
  }

  return startWebSocketClient({
    broadcasterId: state.broadcasterId.value!,
    senderId: state.senderId.value!,
    userAccessToken: state.userAccessToken.value!,
    clientId: state.clientId.value!,
    qrValue: state.qrValue.value!,
  });
};

export default initializeTwitchBot;
