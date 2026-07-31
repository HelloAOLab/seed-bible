const { toUserId, message } = that;

const sendWhisper = async (toUserId: string, message: string) => {
  if (!toUserId || !message) {
    console.error("toUserId and message are required to send a whisper.");
    return;
  }
  try {
    await web.post(
      `https://api.twitch.tv/helix/whispers?from_user_id=${masks?.senderId}&to_user_id=${toUserId}`,
      JSON.stringify({ message }),
      {
        headers: {
          Authorization: `Bearer ${masks?.userAccessToken}`,
          "Client-Id": masks?.clientId,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Whisper sent to user ${toUserId}: "${message}"`);
  } catch {
    console.error("Failed to send whisper");
  }
};

sendWhisper(toUserId, message);
