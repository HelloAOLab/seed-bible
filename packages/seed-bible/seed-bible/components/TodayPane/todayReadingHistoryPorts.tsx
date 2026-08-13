import type { ReadingEvent } from "../../managers/ReadingHistoryManager";
import type { UserProfile } from "../../managers/LoginManager";
import type { Timespan } from "./commonTypes";
import type { CommunityReading, UserLastReading } from "./readingHistory";

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

export interface CommunityReadingProviderPort {
  getCommunityReading<T extends string>(
    spansData: {
      id: T;
      span: Timespan;
    }[]
  ): Promise<CommunityReading<T>>;
}

export interface UserLastReadingProviderPort {
  getUserLastReading(userId: string, span: Timespan): Promise<UserLastReading>;
}
