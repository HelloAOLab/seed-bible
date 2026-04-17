const getUrl = (props: {
  clientId: string;
  broadcasterId: string;
  book?: string;
  chapter?: number;
  translation?: string;
}) => {
  const {
    clientId,
    broadcasterId,
    book = "GEN",
    chapter = 1,
    translation = "AAB",
  } = props;
  const redirectUri = "https://ao.bot/?pattern=SeedBible&ext_twitchSub=true";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: "user:read:chat user:bot channel:bot",
    state: bytes.toBase64String(
      new Uint8Array(
        [
          ...JSON.stringify({
            broadcaster_id: broadcasterId,
            book,
            chapter,
            translation,
          }),
        ].map((c) => c.charCodeAt(0))
      )
    ),
  });
  return `https://id.twitch.tv/oauth2/authorize?${params}`;
};

export default getUrl;
