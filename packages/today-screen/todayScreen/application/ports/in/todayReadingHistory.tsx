import type { Span } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/commonTypes";
import type {
  CommunityReading,
  UserLastReading,
} from "@packages/today-screen/todayScreen/domain/models/readingHistory";

export interface CommunityReadingProviderPort {
  getCommunityReading<T extends string>(
    spansData: {
      id: T;
      span: Span;
    }[]
  ): Promise<CommunityReading<T>>;
}

export interface UserLastReadingProviderPort {
  getUserLastReading(userId: string, span: Span): Promise<UserLastReading>;
}
