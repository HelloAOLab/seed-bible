import { type Signal } from "@preact/signals";
import sendMessage from "ext_twitchPub.host.sendMessage";
import {
  type WSTwitchMessage,
  type WSWelcomeMessage,
  type WSNotificationMessage,
} from "ext_twitchPub.host.interface";

const TWITCH_VALIDATE_URL = "https://id.twitch.tv/oauth2/validate";
const TWITCH_EVENTSUB_WS_URL = "wss://eventsub.wss.twitch.tv/ws";
const TWITCH_EVENTSUB_SUBSCRIPTIONS_URL =
  "https://api.twitch.tv/helix/eventsub/subscriptions";

interface ChannelChatMessageEvent {
  broadcaster_user_id: string;
  chatter_user_id: string;
  chatter_user_name: string;
  message: { text: string };
}

type BotState = {
  broadcasterId: string;
  senderId: string;
  userAccessToken: string;
  clientId: string;
  qrValue: string;
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

const handleCommands = (props: {
  command: string;
  chatterName: string;
  state: BotState;
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

async function getAuth(oauthToken: string) {
  const response = await web.get(TWITCH_VALIDATE_URL, {
    headers: getOauthHeaders(oauthToken),
  });
  return response.status === 200;
}

function handleChatMessageNotification(
  data: WSNotificationMessage<ChannelChatMessageEvent>,
  state: BotState
) {
  const { message, chatter_user_name: chatterName } = data.payload.event;
  if (message.text.startsWith("!")) {
    handleCommands({ chatterName, command: message.text, state });
  }
}

function startWebSocketClient(state: BotState) {
  const websocketClient = new WebSocket(TWITCH_EVENTSUB_WS_URL);

  websocketClient.onerror = (event) => {
    console.error("WebSocket error observed:", event);
  };

  websocketClient.onopen = () => {
    console.log("WebSocket connection opened to " + TWITCH_EVENTSUB_WS_URL);
  };

  websocketClient.onmessage = (event) => {
    try {
      handleWebSocketMessage({ data: JSON.parse(event.data), state });
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
  data: WSTwitchMessage;
  state: BotState;
}) {
  switch (data.metadata.message_type) {
    case "session_welcome": {
      const welcome = data as WSWelcomeMessage;
      websocketSessionID = welcome.payload.session.id;
      registerEventSubListeners({ state });
      break;
    }
    case "notification": {
      const notification =
        data as unknown as WSNotificationMessage<ChannelChatMessageEvent>;
      if (notification.metadata.subscription_type === "channel.chat.message") {
        handleChatMessageNotification(notification, state);
      }
      break;
    }
  }
}

async function registerEventSubListeners({ state }: { state: BotState }) {
  const response = await web.post(
    TWITCH_EVENTSUB_SUBSCRIPTIONS_URL,
    JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: state.broadcasterId,
        user_id: state.senderId,
      },
      transport: {
        method: "websocket",
        session_id: websocketSessionID,
      },
    }),
    {
      headers: getBearerHeaders(state.userAccessToken, state.clientId),
    }
  );

  if (response.status !== 202) {
    return;
  }
}

const initializeTwitchBot = async (state: {
  broadcasterId: Signal<string>;
  senderId: Signal<string>;
  userAccessToken: Signal<string>;
  clientId: Signal<string>;
  qrValue: Signal<string>;
}) => {
  const isAuthValid = await getAuth(state.userAccessToken.value!);
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
