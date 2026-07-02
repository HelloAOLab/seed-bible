import type { AddToPlaylistManager } from "ext_discover.interfaces.managers.AddToPlaylistManager";

export interface AddToPlaylistProps {
  id?: string;
  onClose: () => void;
  manager?: AddToPlaylistManager;
}
