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
  connectionId: string;
}

export class UserPresenceService implements UserPresenceServicePort {
  #userPresence: UserPresence = new Map();
  #eventManagerPort: UserPresenceParams["eventManagerPort"];
  #connectionId: UserPresenceParams["connectionId"];

  constructor({
    eventManagerPort,
    initialUserPresence = new Map(),
    connectionId,
  }: UserPresenceParams) {
    this.#eventManagerPort = eventManagerPort;
    this.#connectionId = connectionId;
    this.update(initialUserPresence);
  }

  #isSamePresence(newPresence: UserPresence): boolean {
    const check = (
      firstMap: UserPresence,
      secondMap: UserPresence
    ): boolean => {
      const firstEntries = [...firstMap.entries()];

      if (firstMap.size !== secondMap.size) return false;

      for (const [connectionId, firstInstances] of firstEntries) {
        if (secondMap.has(connectionId)) {
          const secondInstances = secondMap.get(connectionId)!;
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
      [...presence.entries()].map(([connectionId, instances]) => {
        return [
          connectionId,
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
    return this.#connectionId;
  }

  getOwnUserPresence() {
    return this.#userPresence.get(this.#connectionId) ?? [];
  }

  getRemotesUserPresence(): Map<string, ReadingInstance[]> {
    return new Map(
      [...this.#userPresence.entries()].filter(
        ([connectionId]) => connectionId !== this.#connectionId
      )
    );
  }

  getOwnUserSelectedInstance(): ReadingInstance | undefined {
    const instances = this.getOwnUserPresence();

    return instances?.find((instance) => instance.selected);
  }
}
