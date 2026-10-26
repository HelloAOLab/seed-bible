import "./DiscoverPane.css";
import "./DiscoverShared.css";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { AnnotationsManager } from "../../managers/AnnotationsManager";
import { CreatePlaylistForm } from "../CreatePlaylistForm/CreatePlaylistForm";
import { CreateAnnotationForm } from "../CreateAnnotationForm/CreateAnnotationForm";
import { PlayPlaylistView } from "../PlayPlaylistView/PlayPlaylistView";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { DiscoverContentPanel } from "./DiscoverContentPanel";

export const DISCOVER_PANE_ID = "discover-pane";

interface DiscoverPaneProps {
  tabs: TabsManager;
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
  modals: ModalManager;
  state: SeedBibleState;
  toast: SeedBibleState["app"]["toast"];
}

/**
 * Pane content for the "Discover" tool: picks which view to show from
 * `playlists.actualView` — the chapter's discover content, or the
 * create-playlist, create-annotation and play-playlist sub-views.
 *
 * The side pane is opened without its own `PaneHeader` (see
 * `SeedBibleStateManager`), so each view renders its own header, back button
 * and close button. Closing passes the "user" reason so the pane's `onClose`
 * stops a playing playlist, the same as the pane header's X used to.
 */
export function DiscoverPane(props: DiscoverPaneProps) {
  const { tabs, playlists, annotations, modals, state } = props;
  const close = () => state.panes.closePane(DISCOVER_PANE_ID, "user");
  const view = playlists.actualView.value;

  if (view === "create_playlist") {
    return (
      <CreatePlaylistForm
        playlists={playlists}
        tabs={tabs}
        modals={modals}
        chats={state.chats}
        openChatPanel={state.sidebar.openChatPanel}
        onClose={close}
        bibleData={state.bibleData}
        os={state.os}
        login={state.login}
        gallery={state.gallery}
      />
    );
  }

  if (view === "create_annotation") {
    return (
      <CreateAnnotationForm
        annotations={annotations}
        tabs={tabs}
        toast={props.toast}
        onClose={close}
      />
    );
  }

  if (view === "play_playlist") {
    return (
      <PlayPlaylistView
        state={state}
        playlists={playlists}
        tabs={tabs}
        modals={modals}
        onClose={close}
      />
    );
  }

  // Reading `.value` during render subscribes the component to updates.
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;

  return (
    <DiscoverContentPanel
      variant="full"
      onClose={close}
      state={state}
      tab={selectedTab}
    />
  );
}
