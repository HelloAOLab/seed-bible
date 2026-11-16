import "./DiscoverPane.css";
import "./DiscoverShared.css";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { AnnotationsManager } from "../../managers/AnnotationsManager";
import type { ChatsManager } from "../../managers/ChatsManager";
import { PlaylistEditorPanel } from "../PlaylistEditor/PlaylistEditorPanel";
import { PublishButton } from "../PlaylistEditor/PlaylistEditorWorkspace";
import { CreateAnnotationForm } from "../CreateAnnotationForm/CreateAnnotationForm";
import { PlayPlaylistView } from "../PlayPlaylistView/PlayPlaylistView";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { DiscoverContentPanel } from "./DiscoverContentPanel";
import { useI18n } from "../../i18n/I18nManager";
import { translateTitle } from "../../app/utils";
import { v4 as uuid } from "uuid";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import { IconButton } from "../IconButton/IconButton";

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
      <PlaylistEditorPanel
        playlists={playlists}
        tabs={tabs}
        modals={modals}
        headerActions={
          <EditPlaylistWithAiButton
            chats={state.chats}
            openChatPanel={state.sidebar.openChatPanel}
          />
        }
        footerActions={<PublishButton state={state} />}
      />
    );
  }

  if (view === "create_annotation" && annotations.editingAnnotation.value) {
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

/**
 * Starts a chat with an AI that can edit the open playlist, when an AI that
 * can use tools is available. `PlaylistManager` hands every chat the
 * playlist-editing tools while a playlist is being edited, so replying lets
 * the AI add, change and remove steps and rename the playlist.
 */
export function EditPlaylistWithAiButton(props: {
  chats: ChatsManager;
  openChatPanel: () => void;
}) {
  const { chats, openChatPanel } = props;
  const { t } = useI18n();
  const providers = chats.providers.value.filter((p) => p.supportsToolCalling);
  const singleProvider = providers.length === 1 ? providers[0] : undefined;
  // Opens the chat panel on a fresh local chat, seeded with a prompt message
  // inviting the user to describe what they want changed, with the given AI
  // provider already added as a participant.
  const startAiChat = (providerId: string) => {
    let chat = chats.chats.value.find(
      (c) =>
        c.participants.value.every((p) => !p.isRemote) &&
        c.participants.value.some((p) => p.isAI && p.providerId === providerId)
    );
    if (!chat) {
      chat = chats.createLocalSession({
        messages: [
          {
            id: uuid(),
            authors: [providerId],
            timeMs: Date.now(),
            targets: [],
            type: "text",
            text: t("ai-playlist-chat-prompt", {
              defaultValue: "What do you want to add/change?",
            }),
          },
        ],
        providerIds: [],
      });
    }
    chat.addParticipant(providerId);
    chats.selectChat(chat.id);
    openChatPanel();
  };
  const aiButtonAriaLabel = t("ai-edit-playlist", {
    defaultValue: "Edit playlist with AI",
  });

  if (providers.length > 1) {
    // Multiple providers: let the user pick which one starts the chat.
    return (
      <ContextMenuWithButton
        buttonClassName="sb-discover-title-ai"
        label={aiButtonAriaLabel}
        icon="auto_awesome"
        size="md"
      >
        {providers.map((provider) => (
          <ContextMenuItem
            key={provider.id}
            onClick={() => startAiChat(provider.id)}
          >
            {translateTitle(t, provider.name)}
          </ContextMenuItem>
        ))}
      </ContextMenuWithButton>
    );
  }
  if (!singleProvider) {
    return null;
  }
  return (
    <IconButton
      className="sb-discover-title-ai"
      icon="auto_awesome"
      label={aiButtonAriaLabel}
      onClick={() => startAiChat(singleProvider.id)}
    />
  );
}
