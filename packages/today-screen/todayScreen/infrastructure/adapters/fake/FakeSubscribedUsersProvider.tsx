import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import type {
  ReadingEventsProviderPort,
  UsersIdProviderPort,
  UserProfileProviderPort,
  UserProfile,
} from "todayScreen.application.ports.out.todayReadingHistory";

export interface UserVisualIdentityPort {
  getUserColorById(id: string): string;
  getUserIconById(id: string): string;
}

export interface RichUserProfile extends UserProfile {
  color: string;
  icon: string;
}

interface FakeUser {
  id: string;
  profile: RichUserProfile;
  events: ReadingEvent[];
}

const BOOK_IDS = [
  "GEN",
  "EXO",
  "PSA",
  "PRO",
  "ISA",
  "MAT",
  "JHN",
  "ROM",
  "REV",
  "LUK",
  "ACT",
  "EPH",
  "PHP",
  "COL",
  "HEB",
];

const NAMES = [
  "Craig",
  "Sarah",
  "Michael",
  "Emma",
  "David",
  "Olivia",
  "James",
  "Sophia",
  "Noah",
  "Ava",
];

// TODO: On commit the implements statement makes a line break, resulting on an import error at runtime
// prettier-ignore
export class FakeSubscribedUsersProvider implements ReadingEventsProviderPort, UsersIdProviderPort, UserProfileProviderPort {
  #users: Map<string, FakeUser>;

  constructor(visualIdentity: UserVisualIdentityPort) {
    const now = Math.floor(Date.now() / 1000);
    this.#users = new Map();

    const userCount = 4 + Math.floor(Math.random() * 7); // 4–10

    for (let i = 0; i < userCount; i++) {
      const id = uuid();
      const profile: RichUserProfile = {
        name: NAMES[i % NAMES.length]!,
        color: visualIdentity.getUserColorById(id),
        icon: visualIdentity.getUserIconById(id),
      };
      const events = this.#generateEvents(i, id, now);
      this.#users.set(id, { id, profile, events });
    }
  }

  #generateEvents(
    userIndex: number,
    userId: string,
    now: number
  ): ReadingEvent[] {
    const events: ReadingEvent[] = [];
    const eventCount = 20 + Math.floor(Math.random() * 20); // 3–10 events

    for (let i = 0; i < eventCount; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const offsetSeconds = Math.floor(Math.random() * 24 * 60 * 60);
      const start = now - daysAgo * 24 * 60 * 60 - offsetSeconds;
      const durationSeconds = 5 * 60 + Math.floor(Math.random() * 55 * 60); // 5–60 min
      const end = start + durationSeconds;
      const bookId = BOOK_IDS[(userIndex * 3 + i) % BOOK_IDS.length]!;
      const chapter = (i % 10) + 1;
      events.push({ bookId, chapter, start, end, userId });
    }

    return events;
  }

  async getReadingHistoryEvents(
    recordName: string,
    startTime: number,
    endTime: number
  ): Promise<Iterable<ReadingEvent>> {
    const user = this.#users.get(recordName);
    if (!user) return [];
    return user.events.filter(
      (event) => event.end >= startTime && event.end <= endTime
    );
  }

  getUsersIds(): string[] {
    return [...this.#users.keys()];
  }

  getUserProfile(id: string): RichUserProfile | undefined {
    return this.#users.get(id)?.profile;
  }
}
