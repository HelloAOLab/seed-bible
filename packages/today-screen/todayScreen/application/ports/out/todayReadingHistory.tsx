import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";

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
