import { fromByteArray } from "base64-js";

const sendMessage = async ({
  message,
  to_user,
  broadcasterId,
  senderId,
  userAccessToken,
  clientId,
  encriptMessage = true,
  onAuthError,
}: {
  message: string;
  to_user?: string;
  broadcasterId: string;
  senderId: string;
  userAccessToken: string;
  clientId: string;
  encriptMessage?: boolean;
  onAuthError?: () => void;
}) => {
  if (!senderId || !message || !userAccessToken || !clientId || !broadcasterId)
    return;

  try {
    const encriptedMessage = encriptMessage
      ? fromByteArray(new Uint8Array([...message].map((c) => c.charCodeAt(0))))
      : message;
    const response = await fetch("https://api.twitch.tv/helix/chat/messages", {
      method: "POST",
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        sender_id: senderId,
        message: encriptedMessage,
        reply_parent_message_id: to_user,
      }),
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${userAccessToken}`,
        "Content-Type": "application/json",
      },
    });

    // A 401 means the user access token has expired or been revoked.
    if (response.status === 401) {
      console.error("Twitch access token expired");
      onAuthError?.();
      return;
    }

    const data = await response.json();

    if (!data.data[0].is_sent) {
      console.error("Failed to send message");
    }
    return data;
  } catch {
    console.error("Failed to send message");
  }
};

export default sendMessage;
