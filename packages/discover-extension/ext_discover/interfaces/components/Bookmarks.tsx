import type { BookmarksManager } from "ext_discover.interfaces.managers.BookmarksManager";

export interface BookmarksProps {
  manager?: BookmarksManager;
  currentOpenedBook?: { book?: string; bookId?: string; chapter?: number };
}
