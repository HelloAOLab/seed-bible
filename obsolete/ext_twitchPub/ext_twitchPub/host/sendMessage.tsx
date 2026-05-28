const sendMessage = async ({
  message,
  to_user,
  deleteMessageFlag,
  toChannel = false,
  encript = true,
}: {
  message: string;
  to_user?: string;
  deleteMessageFlag?: boolean;
  toChannel?: boolean;
  encript?: boolean;
}) => {
  if (
    !masks?.broadcasterId ||
    !masks?.senderId ||
    !masks?.channelId ||
    !message ||
    !masks?.userAccessToken ||
    !masks?.clientId
  )
    return;

  console.log("Sending message with token:", masks?.userAccessToken);

  try {
    const finalMessage = encript
      ? bytes.toBase64String(
          new Uint8Array([...message].map((c) => c.charCodeAt(0)))
        )
      : message;
    const response = await web.post(
      "https://api.twitch.tv/helix/chat/messages",
      JSON.stringify({
        broadcaster_id: toChannel ? masks?.channelId : masks?.broadcasterId,
        sender_id: masks?.senderId,
        message: finalMessage,
        reply_parent_message_id: to_user,
      }),
      {
        headers: {
          "Client-ID": masks?.clientId,
          Authorization: `Bearer ${masks?.userAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Message sent successfully:", response.data);
    if (deleteMessageFlag) {
      setTimeout(() => {
        deleteMessage(response.data.data[0].message_id);
      }, 100);
    }
    return response.data;
  } catch {
    console.error("Failed to send message");
  }
};

const deleteMessage = async (messageId: string) => {
  if (
    !masks?.broadcasterId ||
    !masks?.senderId ||
    !messageId ||
    !masks?.userAccessToken ||
    !masks?.clientId
  )
    return;
  try {
    web.hook({
      method: "DELETE",
      url: `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${masks?.broadcasterId}&moderator_id=${masks?.senderId}&message_id=${messageId}`,
      headers: {
        "Client-ID": masks?.clientId,
        Authorization: `Bearer ${masks?.userAccessToken}`,
      },
    });
  } catch {
    console.error("Failed to delete message");
  }
};

export default sendMessage;
