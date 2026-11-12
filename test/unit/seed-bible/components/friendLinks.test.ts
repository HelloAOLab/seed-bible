import {
  getAddFriendUrl,
  getFriendRequestUrl,
} from "@packages/seed-bible/seed-bible/components/FriendsPane/friendLinks";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { injectNativeAppConfig } from "../testUtils/nativeAppConfig";

const USER_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("friend links", () => {
  it("link to the current site, carrying nothing from the sender's page", () => {
    const navigation = createNavigationManager({
      initialHref: "https://seed.example/en/BSB/john/3?sessionId=abc",
    });
    try {
      expect(getAddFriendUrl(navigation, USER_ID)).toBe(
        `https://seed.example/?addFriend=${USER_ID}`
      );
      expect(getFriendRequestUrl(navigation, "request-1")).toBe(
        "https://seed.example/?friendRequest=request-1"
      );
    } finally {
      navigation.dispose();
    }
  });

  it("point at the public website when sent from the native apps", () => {
    const navigation = createNavigationManager({
      initialHref: "capacitor://localhost/en/BSB/john/3",
    });
    const remove = injectNativeAppConfig();
    try {
      expect(getAddFriendUrl(navigation, USER_ID)).toBe(
        `https://seedbible.org/?addFriend=${USER_ID}`
      );
      expect(getFriendRequestUrl(navigation, "request-1")).toBe(
        "https://seedbible.org/?friendRequest=request-1"
      );
    } finally {
      remove();
      navigation.dispose();
    }
  });
});
