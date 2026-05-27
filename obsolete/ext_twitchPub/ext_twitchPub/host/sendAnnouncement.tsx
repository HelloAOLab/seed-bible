const sendAnnouncement = (
  accessToken: string,
  broadcasterId: string,
  moderatorId: string,
  message: string,
  clientId: string
) => {
  web
    .post(
      `https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
      JSON.stringify({
        message: message,
        color: "purple", // blue | green | orange | purple | primary
      }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": clientId,
          "Content-Type": "application/json",
        },
      }
    )
    .then((e) => {
      console.log("Announcement sent successfully", e.data);
    })
    .catch((err) => {
      console.error("Failed to send announcement:", err);
    });
};

export default sendAnnouncement;
