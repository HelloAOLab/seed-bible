import type {
  ReadingInstance,
  UserPresence,
} from "../../domain/models/userPresence";
import type { EventManagerPort } from "../ports/out/EventManager";
import type { BibleStackEvents } from "../../domain/models/events";
import type { UserPresenceServicePort } from "../ports/in/UserPresence";

interface UserPresenceParams {
  eventManagerPort: EventManagerPort<BibleStackEvents>;
  initialUserPresence?: UserPresence;
  userId: string;
}

export class UserPresenceService implements UserPresenceServicePort {
  #userPresence: UserPresence = new Map();
  #eventManagerPort: UserPresenceParams["eventManagerPort"];
  #userId: UserPresenceParams["userId"];

  constructor({
    eventManagerPort,
    initialUserPresence = new Map(),
    userId,
  }: UserPresenceParams) {
    this.#eventManagerPort = eventManagerPort;
    this.#userId = userId;
    this.update(initialUserPresence);
  }

  #isSamePresence(newPresence: UserPresence): boolean {
    const check = (
      firstMap: UserPresence,
      secondMap: UserPresence
    ): boolean => {
      const firstEntries = [...firstMap.entries()];

      if (firstMap.size !== secondMap.size) return false;

      for (const [userId, firstInstances] of firstEntries) {
        if (secondMap.has(userId)) {
          const secondInstances = secondMap.get(userId)!;
          if (firstInstances.length !== secondInstances.length) {
            return false;
          }
          for (const firstInstance of firstInstances) {
            const existent = secondInstances.find(
              (secondInstance) => secondInstance.id === firstInstance.id
            );
            if (existent) {
              if (
                existent.selected !== firstInstance.selected ||
                existent.bookId !== firstInstance.bookId ||
                existent.chapter !== firstInstance.chapter ||
                existent.translation !== firstInstance.translation
              ) {
                return false;
              }
            } else {
              return false;
            }
          }
        } else {
          return false;
        }
      }
      return true;
    };

    return check(this.#userPresence, newPresence);
  }

  #clone(presence: UserPresence): UserPresence {
    return new Map(
      [...presence.entries()].map(([userId, instances]) => {
        return [
          userId,
          instances.map((instance) => {
            return { ...instance };
          }),
        ];
      })
    );
  }

  update(newPresence: UserPresence) {
    const changed = !this.#isSamePresence(newPresence);

    if (!changed) return;

    this.#userPresence = this.#clone(newPresence);
    this.#eventManagerPort.emit("OnUserPresenceUpdated", {
      userPresence: this.getUserPresence(),
    });
  }

  getUserPresence(): UserPresence {
    return this.#clone(this.#userPresence);
  }

  getOwnConnectionId(): string {
    return this.#userId;
  }

  getOwnUserPresence() {
    return this.#userPresence.get(this.#userId) ?? [];
  }

  getRemotesUserPresence(): Map<string, ReadingInstance[]> {
    return new Map(
      [...this.#userPresence.entries()].filter(
        ([userId]) => userId !== this.#userId
      )
    );
  }

  getOwnUserSelectedInstance(): ReadingInstance | undefined {
    const instances = this.getOwnUserPresence();

    return instances?.find((instance) => instance.selected);
  }
}
