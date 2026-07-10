import type {
  CommunityReading,
  UserLastReading,
} from "@packages/today-screen/domain/models/readingHistory";
import type {
  ReadingEventsProviderPort,
  UsersIdProviderPort,
} from "../ports/out/todayReadingHistory";
import type { Span } from "@packages/seed-bible-utils/domain/models/commonTypes";
import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import type {
  CommunityReadingProviderPort,
  UserLastReadingProviderPort,
} from "../ports/in/todayReadingHistory";

interface ServiceParams {
  readingEventsProviderPort: ReadingEventsProviderPort;
  usersIdProviderPort: UsersIdProviderPort;
}

export class TodayReadingHistoryService
  implements CommunityReadingProviderPort, UserLastReadingProviderPort
{
  #readingEventsProviderPort: ServiceParams["readingEventsProviderPort"];
  #usersIdProviderPort: ServiceParams["usersIdProviderPort"];

  constructor({
    readingEventsProviderPort,
    usersIdProviderPort,
  }: ServiceParams) {
    this.#readingEventsProviderPort = readingEventsProviderPort;
    this.#usersIdProviderPort = usersIdProviderPort;
  }

  async getCommunityReading<T extends string>(
    spansData: Array<{ id: T; span: Span }>
  ): Promise<CommunityReading<T>> {
    const communityReading: CommunityReading<T> = {} as CommunityReading<T>;
    const usersIds = this.#usersIdProviderPort.getUsersIds();
    let closestTime = -Infinity;
    let furthestTime = Infinity;

    for (const { id, span } of spansData) {
      communityReading[id] = {};
      const { from, to } = span;

      if (from < furthestTime) {
        furthestTime = from;
      }
      if (to > closestTime) {
        closestTime = to;
      }
    }

    const allUsersEvents = await Promise.all(
      usersIds.map((userId) =>
        this.#readingEventsProviderPort
          .getReadingHistoryEvents(userId, furthestTime, closestTime)
          .then((events) => ({ userId, events }))
      )
    );

    for (const { userId, events } of allUsersEvents) {
      for (const event of events) {
        const { bookId, chapter, end } = event;

        for (const { id, span } of spansData) {
          const { from, to } = span;

          if (from <= end && end <= to) {
            // const readingKey = `${bookId} ${chapter}`;
            const bookIds = communityReading[id] as Record<
              string,
              Record<number, string[]>
            >;
            if (!bookIds[bookId]) {
              bookIds[bookId] = {};
            }
            if (!bookIds[bookId][chapter]) {
              bookIds[bookId][chapter] = [];
            }
            if (!bookIds[bookId][chapter].includes(userId)) {
              bookIds[bookId][chapter].push(userId);
            }
          }
        }
      }
    }

    return communityReading;
  }

  async getUserLastReading(
    userId: string,
    span: Span
  ): Promise<UserLastReading> {
    let userLastReadingEvent: ReadingEvent | undefined = undefined;
    const userReadingEvents =
      await this.#readingEventsProviderPort.getReadingHistoryEvents(
        userId,
        span.from,
        span.to
      );

    const allUserReadingEvents = Array.from(userReadingEvents);

    for (const event of allUserReadingEvents) {
      if (!userLastReadingEvent || userLastReadingEvent.end < event.end) {
        userLastReadingEvent = event;
      }
    }

    if (!userLastReadingEvent) return undefined;

    return {
      bookId: userLastReadingEvent.bookId,
      chapter: userLastReadingEvent.chapter,
    };
  }
}
