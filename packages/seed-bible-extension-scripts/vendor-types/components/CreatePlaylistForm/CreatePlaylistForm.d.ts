import "./CreatePlaylistForm.css";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
interface CreatePlaylistFormProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
}
/** Create-playlist screen shown inside the discover pane. */
export declare function CreatePlaylistForm(
  props: CreatePlaylistFormProps
): import("preact").JSX.Element;
export {};
