import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import type { FollowsManager } from "@packages/seed-bible/seed-bible/managers/FollowsManager";
import { getUserAnimalVisual } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import type {
  ReadingEventsProviderPort,
  UsersIdProviderPort,
  UserProfileProviderPort,
  UserProfile,
} from "@packages/today-screen/application/ports/out/todayReadingHistory";

export interface UserVisualIdentityPort {
  getUserColorById(id: string): string;
  getUserIconById(id: string): string;
}

export interface RichUserProfile extends UserProfile {
  color: string;
  icon: string;
}

/**
 * Exposes the accounts the signed-in user follows to the Today screen's
 * Community section.
 *
 * A thin adapter over {@link FollowsManager}: it reads the follow list rather
 * than keeping its own copy, so following or unfollowing someone is reflected
 * the next time the section reads from it.
 *
 * Profile details come from the snapshot stored alongside each follow, which is
 * why no network call is needed to render names and pictures.
 */
export class SubscribedUsersProvider
  implements
    ReadingEventsProviderPort,
    UsersIdProviderPort,
    UserProfileProviderPort
{
  #follows: FollowsManager;

  constructor(follows: FollowsManager) {
    this.#follows = follows;
  }

  /**
   * Reading events are fetched by the caller through
   * `getReadingHistoryEvents(os, recordName, ...)`, which already accepts any
   * account's record name. This provider only supplies *which* accounts to
   * read, so there is nothing to return here.
   */
  async getReadingHistoryEvents(): Promise<Iterable<ReadingEvent>> {
    return [];
  }

  /**
   * Reads the follow-list signal, so calling this inside a `computed` /
   * `useComputed` subscribes the caller to follow-list changes. Callers that
   * read it from a plain `useEffect` will not re-run on their own.
   */
  getUsersIds(): string[] {
    return this.#follows.followingIds.value;
  }

  getUserProfile(id: string): RichUserProfile | undefined {
    const entry = this.#follows.following.value.find((f) => f.userId === id);
    if (!entry) {
      return undefined;
    }
    // `getUserAnimalVisual` is the same pure hash the session avatars use, so a
    // followed account gets one consistent color and icon everywhere in the app
    // — the Community section, the participant list, and the reader.
    const visual = getUserAnimalVisual(id);
    return {
      name: entry.name?.trim() || `User ${id.slice(0, 8)}`,
      pictureUrl: entry.pictureUrl ?? null,
      color: visual.color,
      icon: visual.defaultIcon,
    };
  }
}
