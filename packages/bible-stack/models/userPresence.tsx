export interface ReadingInstance {
  bookId?: string | null;
  chapter?: number;
  id: string;
  selected: boolean;
  translation?: string;
  connectionId: string;
}

export type UserPresence = Map<string, ReadingInstance[]>;
