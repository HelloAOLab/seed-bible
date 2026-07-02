import type { PlayingPlaylistId } from "ext_discover.models.playlist";
import type { CreatePlaylistUIManager } from "ext_discover.interfaces.managers.CreatePlaylistUIManager";

export interface CreatePlaylistUIProps {
  id?: string;
  isCreate?: boolean;
  setTab?: (tab: string) => void;
  isLayers?: boolean;
  playingPlaylist?: PlayingPlaylistId;
  editData?: Record<string, unknown>;
  setOpenModal?: (value: boolean) => void;
  active?: boolean;
  createManager?: CreatePlaylistUIManager;
}
