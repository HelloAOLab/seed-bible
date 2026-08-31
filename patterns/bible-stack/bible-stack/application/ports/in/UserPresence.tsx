import type {
  ReadingInstance,
  UserPresence,
} from "../../../domain/models/userPresence";

export interface UserPresencePort {
  update(newPresence: UserPresence): void;

  getUserPresence(): UserPresence;

  getOwnConnectionId(): string;

  getOwnUserPresence(): ReadingInstance[];

  getRemotesUserPresnece(): Map<string, ReadingInstance[]>;

  getOwnUserSelectedInstance(): ReadingInstance | undefined;
}
