import type { CSSProperties } from "preact";
import type { DiscoverManager } from "ext_discover.interfaces.managers.DiscoverManager";
import type {
  CurrentOpenedBook,
  PlayingPlaylistId,
} from "ext_discover.models.playlist";

export interface DiscoverProps {
  discover?: DiscoverManager;
  currentOpenedBook: CurrentOpenedBook;
  setAnnotationData: (
    value: unknown[] | ((prev: unknown[]) => unknown[])
  ) => void;
  chapter?: number;
  fetchingAnnotation: boolean;
  playingPlaylist: PlayingPlaylistId;
  editingPlaylist: string | null;
  annotationData: unknown[];
  style?: CSSProperties;
  setOpenModal: (value: boolean) => void;
  annotationSources: unknown[];
  tagsSources: unknown[];
}
