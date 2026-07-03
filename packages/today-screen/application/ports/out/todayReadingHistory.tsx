import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";

export type { UserProfile };

export interface ReadingEventsProviderPort {
  getReadingHistoryEvents(
    recordName: string,
    startTime: number,
    endTime: number
  ): Promise<Iterable<ReadingEvent>>;
}

export interface UsersIdProviderPort {
  getUsersIds(): string[];
}

export interface UserProfileProviderPort {
  getUserProfile(id: string): UserProfile | undefined;
}
