import { signal, type ReadonlySignal } from "@preact/signals";
import {
  userProfileSchema,
  type LoginManager,
  type UserProfile,
} from "./LoginManager";
import type { NavigationManager } from "./NavigationManager";
import {
  ADD_FRIEND_PARAM,
  parseUserId,
} from "../components/FriendsPane/friendLinks";

const SSR_FRIEND_LINK_TIMEOUT_MS = 5000;

export interface FriendLinkSeed {
  userId: string;
  profile: UserProfile | null;
}

export interface FriendLinkPreviewLoader {
  result: ReadonlySignal<FriendLinkSeed | null>;
  initialLoadPromise: Promise<void>;
  getSeed: () => FriendLinkSeed | null;
}

export function createFriendLinkPreviewLoader(options: {
  login: Pick<LoginManager, "getPublicProfile">;
  navigation: Pick<NavigationManager, "initialUrl">;
  initialSeed?: FriendLinkSeed;
}): FriendLinkPreviewLoader {
  const { login, navigation, initialSeed } = options;

  const raw = navigation.initialUrl.searchParams.get(ADD_FRIEND_PARAM);
  const userId = raw ? parseUserId(raw) : null;

  let resolveInitialLoad: () => void = () => {};
  const initialLoadPromise = new Promise<void>((resolve) => {
    resolveInitialLoad = resolve;
  });
  const result = signal<FriendLinkSeed | null>(null);

  if (userId) {
    const parsedSeed =
      initialSeed?.userId === userId
        ? userProfileSchema.nullable().safeParse(initialSeed.profile)
        : null;
    if (parsedSeed?.success) {
      result.value = { userId, profile: parsedSeed.data };
      resolveInitialLoad();
    } else {
      login
        .getPublicProfile(userId)
        .then((profile) => {
          result.value = { userId, profile };
        })
        .catch((error) => {
          console.warn("Could not load the profile for a friend link:", error);
        })
        .finally(resolveInitialLoad);
      if (import.meta.env.SSR) {
        const timer = setTimeout(() => {
          console.warn(
            "Timed out waiting for friend link profile load",
            userId
          );
          resolveInitialLoad();
        }, SSR_FRIEND_LINK_TIMEOUT_MS);
        void initialLoadPromise.then(() => clearTimeout(timer));
      }
    }
  } else {
    resolveInitialLoad();
  }

  return {
    result,
    initialLoadPromise,
    getSeed: () => result.peek(),
  };
}
