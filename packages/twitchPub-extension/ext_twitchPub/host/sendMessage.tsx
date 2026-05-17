const sendMessage = async ({
  message,
  to_user,
  broadcasterId,
  senderId,
  userAccessToken,
  clientId,
  encriptMessage = true,
}: {
  message: string;
  to_user?: string;
  broadcasterId: string;
  senderId: string;
  userAccessToken: string;
  clientId: string;
  encriptMessage?: boolean;
}) => {
  if (!senderId || !message || !userAccessToken || !clientId || !broadcasterId)
    return;

  try {
    const encriptedMessage = encriptMessage
      ? bytes.toBase64String(
          new Uint8Array([...message].map((c) => c.charCodeAt(0)))
        )
      : message;
    const response = await web.post(
      "https://api.twitch.tv/helix/chat/messages",
      JSON.stringify({
        broadcaster_id: broadcasterId,
        sender_id: senderId,
        message: encriptedMessage,
        reply_parent_message_id: to_user,
      }),
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${userAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.data.data[0].is_sent) {
      console.error("Failed to send message");
    }
    return response.data;
  } catch {
    console.error("Failed to send message");
  }
};

export default sendMessage;
