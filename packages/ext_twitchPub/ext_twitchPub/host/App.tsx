import DraggableContainer from "ext_twitchPub.host.DraggableContainer";
import Login from "ext_twitchPub.host.Login";
import Authorization from "ext_twitchPub.host.Authenticate";
import TwitchInterface from "ext_twitchPub.host.TwitchInterface";
import TwitchSettings from "ext_twitchPub.host.TwitchSettings";
const style = thisBot.tags["App.css"];

const { useState, useEffect, useCallback } = os.appHooks;
const senderScope =
  "user:read:email user:write:chat user:read:chat chat:read user:bot moderator:manage:announcements user:manage:whispers moderator:manage:chat_messages";

function App() {
  const [clientId, setClientId] = useState<string>(
    "rkp2fgvhgsi0fe7x62heitsim5zsw8"
  );
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
    masks?.translationEnabled || true
  );
  const [highlightEnabled, setHighlightEnabled] = useState(
    masks?.highlightEnabled || true
  );
  const [annoucementTimer, setAnnouncementTimer] = useState<number | null>(
    masks?.annoucementTimer || null
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
