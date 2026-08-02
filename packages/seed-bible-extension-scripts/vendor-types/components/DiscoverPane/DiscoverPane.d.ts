import "./DiscoverPane.css";
import "./DiscoverShared.css";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
interface DiscoverPaneProps {
  tabs: TabsManager;
  playlists: PlaylistManager;
  modals: ModalManager;
  state: SeedBibleState;
  toast: SeedBibleState["app"]["toast"];
}
/**
 * Header actions rendered in the pane's `PaneHeader` slot (see how the Discover
 * side pane is opened in `SeedBibleStateManager`). Only the discover sub-view
 * offers "create a playlist", so the button hides itself during the
 * create/play sub-views. Reads the `actualView` signal, so it stays reactive
 * and resets alongside the pane body when the active tab stops playing.
 */
export declare function DiscoverPaneHeader(props: {
  playlists: PlaylistManager;
}): import("preact").JSX.Element | null;
/**
 * Title rendered in the pane's `PaneHeader` (passed as the pane's `title`
 * render function, see `SeedBibleStateManager`). In the discover sub-view it's
 * just the "Discover" label; while viewing or editing a playlist it becomes a
 * back button plus the playlist title (an editable input when editing), so
 * those controls live in the pane header rather than below it. Reads the
 * `actualView`/`playing`/`editingPlaylist` signals, so it stays reactive and
 * resets alongside the pane body when the active tab stops playing.
 */
export declare function DiscoverPaneTitle(props: {
  playlists: PlaylistManager;
}): import("preact").JSX.Element;
/**
 * Pane content for the "Discover" tool. Shows the user's authored playlists plus
 * discovered cross references, study notes, and content for the currently
 * selected reader tab. Annotations are a placeholder for now (display-only).
 *
 * Rendered inside the managed side pane (`SidePane`), so the pane shell supplies
 * the surrounding chrome — the title/close (`PaneHeader`), the docking layout,
 * and the mobile-fullscreen behavior. This component just renders the content.
 */
export declare function DiscoverPane(
  props: DiscoverPaneProps
): import("preact").JSX.Element;
export {};
