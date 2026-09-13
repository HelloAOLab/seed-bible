import type {
  ConnectionSessionUserVisual,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers";

export interface ReadingInstance {
  bookId?: string | null;
  chapter?: number;
  id: string;
  selected: boolean;
  translation?: string;
  connectionId: string;
}

export type UserPresence = Map<string, ReadingInstance[]>;

export interface ConnectedUserData {
  connectionId?: string;
  userId?: string;
  profile: UserProfile | undefined;
  visual: ConnectionSessionUserVisual;
}

export type UserIdentityMap = Map<string, ConnectedUserData>;
