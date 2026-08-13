import type { ReadingEvent } from "../../managers/ReadingHistoryManager";
import type {
  ReadingEventsProviderPort,
  UsersIdProviderPort,
  UserProfileProviderPort,
  UserProfile,
} from "./todayReadingHistoryPorts";

export interface UserVisualIdentityPort {
  getUserColorById(id: string): string;
  getUserIconById(id: string): string;
}

export interface RichUserProfile extends UserProfile {
  color: string;
  icon: string;
}

interface User {
  id: string;
  profile: RichUserProfile;
  events: ReadingEvent[];
}

export class SubscribedUsersProvider
  implements
    ReadingEventsProviderPort,
    UsersIdProviderPort,
    UserProfileProviderPort
{
  #users: Map<string, User>;

  constructor(/*visualIdentity: UserVisualIdentityPort*/) {
    this.#users = new Map();
  }

  async getReadingHistoryEvents() // recordName: string,
  // startTime: number,
  // endTime: number
  : Promise<Iterable<ReadingEvent>> {
    return [];
  }

  getUsersIds(): string[] {
    return [...this.#users.keys()];
  }

  getUserProfile(id: string): RichUserProfile | undefined {
    return this.#users.get(id)?.profile;
  }
}
