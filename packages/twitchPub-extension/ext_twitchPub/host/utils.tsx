import { type TwitchPubState } from "ext_twitchPub.host.interface";
import { type SeedBibleState } from "seed-bible.app.api";
import { type Signal } from "@preact/signals";

const senderScope =
  "user:read:email user:write:chat user:read:chat chat:read user:bot moderator:manage:announcements user:manage:whispers moderator:manage:chat_messages";

const fetchUserIds = async (
  clientId: string,
  token: string,
  broadcasterId: Signal<string>,
  senderId: Signal<string>
) => {
  const response = await web.get("https://api.twitch.tv/helix/users", {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.data;
  if (data.data && data.data.length > 0) {
    const id = data.data[0].id;
    broadcasterId.value = id;
    senderId.value = id;
  }
};

const checkAuthorizationStatus = async (
  clientId: string,
  deviceCode: string,
  userAccessToken: Signal<string>,
  currentPage: Signal<"login" | "authorization" | "interface" | "settings">
) => {
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
      userAccessToken.value = data.access_token;
      currentPage.value = "interface";

      // Successful login
      if (typeof posthog !== "undefined" && posthog) {
        posthog.capture("twitch_host_login_success", {});
      }
    } else {
      const errorData = await response.data;
      if (errorData.error === "authorization_pending") {
        setTimeout(() => {
          checkAuthorizationStatus(
            clientId,
            deviceCode,
            userAccessToken,
            currentPage
          );
        }, 5000);
      } else {
        setTimeout(() => {
          checkAuthorizationStatus(
            clientId,
            deviceCode,
            userAccessToken,
            currentPage
          );
        }, 5000);
      }
    }
  } catch (error) {
    console.error("Network error while checking authorization status:", error);
    setTimeout(() => {
      checkAuthorizationStatus(
        clientId,
        deviceCode,
        userAccessToken,
        currentPage
      );
    }, 5000);
  }
};

const getDeviceAuthUrl = (state: TwitchPubState) => {
  state.loading.value = true;
  const params = new URLSearchParams({
    client_id: state.twitchConfig.value.clientId.value,
    scopes: senderScope,
  });
  const url = `https://id.twitch.tv/oauth2/device?${params}`;
  const response = web.post(url).then((res) => res.data);
  response
    .then((data) => {
      const verificationUrl = data.verification_uri;
      const fetchedDeviceCode = data.device_code;
      state.deviceCode.value = fetchedDeviceCode;
      state.currentPage.value = "authorization";
      window.open(verificationUrl, "_blank");
      state.loading.value = false;
    })
    .catch((error) => {
      console.error("Error requesting device authorization URL:", error);
      os.toast(
        "Failed to get device authorization URL. Please check your Client ID and try again."
      );
      state.loading.value = false;
    });
};

const seedBibleStateChanged = (seedBibleState: SeedBibleState) => {
  console.log("SeedBibleState changed:", seedBibleState);
};

export {
  fetchUserIds,
  checkAuthorizationStatus,
  getDeviceAuthUrl,
  seedBibleStateChanged,
};
