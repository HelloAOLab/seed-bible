import type { NavigationManager } from "../../managers/NavigationManager";

/** `?addFriend=<userId>`: asks whoever opens it to send that person a request. */
export const ADD_FRIEND_PARAM = "addFriend";

/** `?friendRequest=<requestId>`: opens one pending request straight to Accept. */
export const FRIEND_REQUEST_PARAM = "friendRequest";

/** CasualOS user IDs are UUIDs; checked so a typo doesn't send a request to nobody. */
const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `input` as a user ID, lowercased to match how CasualOS writes them, or
 * null when it isn't one.
 */
export function parseUserId(input: string): string | null {
  const trimmed = input.trim();
  return USER_ID_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
}

/*
 * Both links are built from the deployment root so they work on preview
 * deploys, and carry nothing from the sender's current page.
 */

export function getAddFriendUrl(
  navigation: Pick<NavigationManager, "linkToBareRoot">,
  userId: string
): string {
  return navigation.linkToBareRoot({ [ADD_FRIEND_PARAM]: userId });
}

export function getFriendRequestUrl(
  navigation: Pick<NavigationManager, "linkToBareRoot">,
  requestId: string
): string {
  return navigation.linkToBareRoot({ [FRIEND_REQUEST_PARAM]: requestId });
}
