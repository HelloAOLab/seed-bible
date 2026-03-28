const sendMessage = async (message: string) => {
  if (!masks?.broadcasterId || !masks?.senderId) return;

  console.log("Sending message with token:", masks?.userAccessToken);

  await web.post(
    "https://api.twitch.tv/helix/chat/messages",
    JSON.stringify({
      broadcaster_id: masks?.broadcasterId,
      sender_id: masks?.senderId,
      message,
    }),
    {
      headers: {
        "Client-ID": masks?.clientId,
        Authorization: `Bearer ${masks?.userAccessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
};

sendMessage(that.message);
