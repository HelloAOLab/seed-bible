import DraggableContainer from "ext_twitchPub.host.DraggableContainer";
import Login from "ext_twitchPub.host.Login";
import Authorization from "ext_twitchPub.host.Authenticate";
import TwitchInterface from "ext_twitchPub.host.TwitchInterface";
import TwitchSettings from "ext_twitchPub.host.TwitchSettings";
import sendMessage from "ext_twitchPub.host.sendMessage";
const style = thisBot.tags["App.css"];

const { useState, useEffect, useCallback } = os.appHooks;
const senderScope =
  "user:read:email user:write:chat user:read:chat chat:read user:bot moderator:manage:announcements user:manage:whispers moderator:manage:chat_messages";

function App() {
  const clientId = "cfjslv2429r70ek579iogr02vecn6d";
  const channelId = "1455265905";
  const [currentPage, setCurrentPage] = useState<
    "login" | "authorization" | "interface" | "settings"
  >(masks?.currentPage || "login");
  const [deviceCode, setDeviceCode] = useState<string | null>(
    masks?.deviceCode || null
  );
  const [userAccessToken, setUserAccessToken] = useState<string | null>(
    masks?.userAccessToken || null
  );

  const [senderId, setSenderId] = useState<string | null>(
    masks?.senderId || null
  );
  const [broadcasterId, setBroadcasterId] = useState<string | null>(
    masks?.broadcasterId || null
  );
  const [loading, setLoading] = useState<boolean>(false);

  const [translationEnabled, setTranslationEnabled] = useState(
    masks?.translationEnabled || false
  );
  const [highlightEnabled, setHighlightEnabled] = useState(
    masks?.highlightEnabled || true
  );
  const [annoucementTimer, setAnnouncementTimer] = useState<number>(
    masks?.annoucementTimer || 0
  );

  const fetchBroadcasterId = async (token: string) => {
    const response = await web.get("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.data;
    if (data.data && data.data.length > 0) {
      setBroadcasterId(data.data[0].id);
    }
  };

  const fetchSenderId = async (token: string) => {
    const response = await web.get("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.data;
    if (data.data && data.data.length > 0) {
      setSenderId(data.data[0].id);
    }
  };

  const checkAuthorizationStatus = async () => {
    const params = new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode || "",
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      scopes: senderScope,
    });
    const url = `https://id.twitch.tv/oauth2/token?${params}`;
    try {
      const response = await web.post(url);
      if (response.status === 200) {
        const data = await response.data;
        console.log("Access token:", data.access_token);
        setUserAccessToken(data.access_token);
        setCurrentPage("interface");
      } else {
        const errorData = await response.data;
        if (errorData.error === "authorization_pending") {
          console.log("Authorization pending, checking again in 5 seconds...");
          setTimeout(() => {
            console.log("Re-checking authorization status...");
            checkAuthorizationStatus();
          }, 5000);
        } else {
          console.error("Error checking authorization status:", errorData);
          console.log("Authorization pending, checking again in 5 seconds...");
          setTimeout(() => {
            console.log("Re-checking authorization status...");
            checkAuthorizationStatus();
          }, 5000);
        }
      }
    } catch (error) {
      console.error(
        "Network error while checking authorization status:",
        error
      );
      setTimeout(() => {
        console.log("Re-checking authorization status...");
        checkAuthorizationStatus();
      }, 5000);
    }
  };

  const getDeviceAuthUrl = () => {
    console.log("Requesting device authorization URL...");
    setLoading(true);
    const params = new URLSearchParams({
      client_id: clientId,
      scopes: senderScope,
    });
    const url = `https://id.twitch.tv/oauth2/device?${params}`;
    const response = web.post(url).then((res) => res.data);
    response
      .then((data) => {
        const verificationUrl = data.verification_uri;
        const deviceCode = data.device_code;
        setDeviceCode(deviceCode);
        setCurrentPage("authorization");
        window.open(verificationUrl, "_blank");
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error requesting device authorization URL:", error);
        os.toast(
          "Failed to get device authorization URL. Please check your Client ID and try again."
        );
        setLoading(false);
      });
  };

  const rateLimiter = createRateLimiter(
    (type, payload, parts, currentPart, uid) =>
      sendMessage({
        message: JSON.stringify({ type, parts, currentPart, payload, uid }),
        toChannel: true,
      })
  );

  useEffect(() => {
    globalThis.sendMessageWithRateLimit = rateLimiter;
    return () => {
      globalThis.sendMessageWithRateLimit = null;
    };
  }, [rateLimiter]);

  useEffect(() => {
    if (deviceCode && currentPage === "authorization") {
      checkAuthorizationStatus();
    } else if (userAccessToken && currentPage === "interface") {
      fetchBroadcasterId(userAccessToken);
      fetchSenderId(userAccessToken);
    }
  }, [deviceCode, currentPage, userAccessToken]);

  useEffect(() => {
    setTagMask(thisBot, "clientId", clientId, "local");
    setTagMask(thisBot, "currentPage", currentPage, "local");
    setTagMask(thisBot, "deviceCode", deviceCode, "local");
    setTagMask(thisBot, "userAccessToken", userAccessToken, "local");
    setTagMask(thisBot, "senderId", senderId, "local");
    setTagMask(thisBot, "broadcasterId", broadcasterId, "local");
    setTagMask(thisBot, "translationEnabled", translationEnabled, "local");
    setTagMask(thisBot, "highlightEnabled", highlightEnabled, "local");
    setTagMask(thisBot, "annoucementTimer", annoucementTimer, "local");
    setTagMask(thisBot, "channelId", channelId, "local");
  }, [
    clientId,
    currentPage,
    deviceCode,
    userAccessToken,
    senderId,
    broadcasterId,
    translationEnabled,
    highlightEnabled,
    annoucementTimer,
    channelId,
  ]);

  const renderPage = useCallback(() => {
    switch (currentPage) {
      case "login":
        return (
          <Login
            clientId={clientId}
            getDeviceAuthUrl={getDeviceAuthUrl}
            loading={loading}
          />
        );
      case "authorization":
        return <Authorization />;
      case "interface":
        return (
          <TwitchInterface
            broadcasterId={broadcasterId}
            clientId={clientId}
            token={userAccessToken}
            setCurrentPage={setCurrentPage}
            annoucementTimer={annoucementTimer}
            channelId={channelId}
          />
        );
      case "settings":
        return (
          <TwitchSettings
            setCurrentPage={setCurrentPage}
            translationEnabled={translationEnabled}
            highlightEnabled={highlightEnabled}
            setTranslationEnabled={setTranslationEnabled}
            setHighlightEnabled={setHighlightEnabled}
            annoucementTimer={annoucementTimer}
            setAnnouncementTimer={setAnnouncementTimer}
          />
        );
      default:
        return null;
    }
  }, [
    currentPage,
    userAccessToken,
    broadcasterId,
    senderId,
    loading,
    clientId,
    translationEnabled,
    highlightEnabled,
    annoucementTimer,
    channelId,
  ]);
  return (
    <>
      <style>{style}</style>
      <DraggableContainer>
        <div className="twitchPub-container">{renderPage()}</div>
      </DraggableContainer>
    </>
  );
}

export default App;

function createRateLimiter(
  send: (
    type: string,
    payload: string,
    parts: number,
    currentPart: number,
    uid: string
  ) => void
) {
  const CHUNK_SIZE = 350;
  const limit = 18,
    windowDuration = 30000,
    interval = 2000;
  const pending = new Map<string, string>();
  let messageCount = 0;
  let processing = false;
  let windowStart = Date.now();
  let lastSentTime = 0;

  function wait(ms: number) {
    return new Promise<void>((res) => setTimeout(res, ms));
  }

  async function checkRateLimit() {
    // Enforce minimum interval between any two sends
    const timeSinceLast = Date.now() - lastSentTime;
    if (lastSentTime > 0 && timeSinceLast < interval) {
      await wait(interval - timeSinceLast);
    }

    // Enforce window rate limit
    const elapsed = Date.now() - windowStart;
    if (elapsed >= windowDuration) {
      messageCount = 0;
      windowStart = Date.now();
    }
    if (messageCount >= limit) {
      await wait(windowDuration - (Date.now() - windowStart));
      messageCount = 0;
      windowStart = Date.now();
    }
  }

  async function processQueue() {
    if (processing) return;
    processing = true;

    while (pending.size > 0) {
      const [type, payload] = pending.entries().next().value as [
        string,
        string,
      ];
      pending.delete(type);

      const chunks: string[] = [];
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        chunks.push(payload.slice(i, i + CHUNK_SIZE));
      }
      const parts = chunks.length;
      const uid = uuid().slice(0, 5);

      for (let i = 0; i < parts; i++) {
        await checkRateLimit();
        send(type, chunks[i]!, parts, i, uid);
        lastSentTime = Date.now();
        messageCount++;
      }
    }

    processing = false;
  }

  return function enqueue(type: string, payload: string) {
    pending.set(type, payload);
    processQueue();
  };
}
