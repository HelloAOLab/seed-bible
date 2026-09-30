import "./DiscoverPane.css";
import "./DiscoverShared.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { ChatsManager } from "../../managers/ChatsManager";
import { translateTitle } from "../../app/utils";
import { v4 as uuid } from "uuid";
import type { AnnotationsManager } from "../../managers/AnnotationsManager";
import { MaterialIcon } from "../icons";
import { Spinner } from "../Spinner/Spinner";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import {
  CreatePlaylistForm,
  requestCancelPlaylistEditor,
} from "../CreatePlaylistForm/CreatePlaylistForm";
import { CreateAnnotationForm } from "../CreateAnnotationForm/CreateAnnotationForm";
import { PlayPlaylistView } from "../PlayPlaylistView/PlayPlaylistView";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  CrossReferencesSection,
  StudyNotesSection,
  ContentSection,
  ContentTypeSection,
} from "./DiscoveredResultsSections";
import {
  AnnotationsSection,
  annotationLocationLabel,
} from "./AnnotationsSection";

interface DiscoverPaneProps {
  tabs: TabsManager;
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
  modals: ModalManager;
  state: SeedBibleState;
  toast: SeedBibleState["app"]["toast"];
}

/**
 * Header actions rendered in the pane's `PaneHeader` slot (see how the Discover
 * side pane is opened in `SeedBibleStateManager`). Only the discover sub-view
 * offers "create", so the button hides itself during the create/play
 * sub-views. Reads the `actualView` signal, so it stays reactive and resets
 * alongside the pane body when the active tab stops playing.
 */
export function DiscoverPaneHeader(props: {
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
}) {
  const { playlists, annotations } = props;
  const { t } = useI18n();

  if (playlists.actualView.value !== "discover") {
    return null;
  }

  return (
    <ContextMenuWithButton
      buttonClassName="sb-discover-create"
      aria-label={t("create-menu", { defaultValue: "Create" })}
      icon={<>+ {t("create-playlist", { defaultValue: "Create" })}</>}
    >
      <ContextMenuItem onClick={() => void annotations.createNewAnnotation()}>
        <MaterialIcon className="sb-context-menu-item-icon">
          edit_note
        </MaterialIcon>
        {t("create-annotation-menu-item", { defaultValue: "Annotation" })}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => void playlists.createNewPlaylist()}>
        <MaterialIcon className="sb-context-menu-item-icon">
          queue_music
        </MaterialIcon>
        {t("create-playlist-menu-item", { defaultValue: "Playlist" })}
      </ContextMenuItem>
    </ContextMenuWithButton>
  );
}

/**
 * Title rendered in the pane's `PaneHeader` (passed as the pane's `title`
 * render function, see `SeedBibleStateManager`). In the discover sub-view it's
 * just the "Discover" label; while viewing or editing a playlist it becomes a
 * back button plus the playlist title (an editable input when editing), so
 * those controls live in the pane header rather than below it. Reads the
 * `actualView`/`playing`/`editingPlaylist` signals, so it stays reactive and
 * resets alongside the pane body when the active tab stops playing.
 */
export function DiscoverPaneTitle(props: {
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
  tabs: TabsManager;
  chats: ChatsManager;
  openChatPanel: () => void;
  modals?: ModalManager;
}) {
  const { playlists, annotations, tabs, chats, openChatPanel } = props;
  const { t } = useI18n();
  const view = playlists.actualView.value;

  if (view === "create_annotation") {
    const editing = annotations.editingAnnotation.value;
    const location = editing ? annotationLocationLabel(editing, tabs) : null;
    return (
      <div className="sb-discover-title-row">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => annotations.cancelEditingAnnotation()}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <span className="sb-discover-title" dir="auto">
          {t("annotate-title", {
            location: location ?? "",
            defaultValue: "Annotate {{location}}",
          })}
        </span>
      </div>
    );
  }

  if (view === "play_playlist") {
    const playing = playlists.playing.value;
    const title =
      playing?.playlists.value[0]?.title ??
      t("untitled-playlist", { defaultValue: "Untitled playlist" });
    return (
      <div className="sb-discover-title-row">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => playlists.goBackFromPlayingView()}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <span className="sb-discover-title" dir="auto">
          {title}
        </span>
        {playlists.openingPlayback?.value ? <Spinner size="1rem" /> : null}
      </div>
    );
  }

  if (view === "create_playlist") {
    const editing = playlists.editingPlaylist.value;
    const providers = chats.providers.value.filter(
      (p) => p.supportsToolCalling
    );
    // Opens the chat panel on a fresh local chat, seeded with an anonymous
    // prompt message inviting the user to describe what they want changed,
    // with the given AI provider (if any) already added as a participant.
    // `PlaylistManager` already exposes the playlist-editing tools to every
    // chat while a playlist is being edited, so replying here lets the AI
    // add/update/remove items and edit the title/description.
    const startAiChat = (providerId: string | null) => {
      let chat = chats.chats.value.find(
        (c) =>
          c.participants.value.every((p) => !p.isRemote) &&
          c.participants.value.some(
            (p) => p.isAI && p.providerId === providerId
          )
      );
      if (!chat) {
        chat = chats.createLocalSession({
          messages: [
            {
              id: uuid(),
              authors: providerId ? [providerId] : [],
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
      if (providerId) {
        chat.addParticipant(providerId);
      }
      chats.selectChat(chat.id);
      openChatPanel();
    };
    const aiButtonLabel = t("ai", { defaultValue: "AI" });
    const aiButtonAriaLabel = t("ai-edit-playlist", {
      defaultValue: "Edit playlist with AI",
    });
    return (
      <div className="sb-discover-title-row">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => {
            if (props.modals) {
              requestCancelPlaylistEditor(playlists, props.modals);
              return;
            }
            playlists.cancelEditingPlaylist();
          }}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <input
          className="sb-settings-text-input sb-playlist-input"
          type="text"
          value={editing?.title ?? ""}
          dir="auto"
          onInput={(event: Event) => {
            const value = (event.currentTarget as HTMLInputElement).value;
            playlists.updateEditingPlaylistMetadata({
              title: value.trim() ? value : null,
            });
          }}
          placeholder={t("playlist-title_placeholder", {
            defaultValue: "Playlist title",
          })}
        />
        {providers.length > 1 ? (
          // Multiple providers: let the user pick which one starts the chat.
          <ContextMenuWithButton
            buttonClassName="sb-discover-title-ai"
            aria-label={aiButtonAriaLabel}
            title={aiButtonLabel}
            icon={
              <>
                <MaterialIcon>auto_awesome</MaterialIcon>
              </>
            }
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
        ) : (
          // Zero or one provider: no choice to make, so skip the menu. A
          // single provider is added automatically; with none, the chat opens
          // with just the prompt message.
          <button
            type="button"
            className="sb-discover-title-ai"
            aria-label={aiButtonAriaLabel}
            title={aiButtonLabel}
            onClick={() => startAiChat(providers[0]?.id ?? null)}
          >
            <MaterialIcon>auto_awesome</MaterialIcon>
          </button>
        )}
      </div>
    );
  }

  return <>{t("discover", { defaultValue: "Discover" })}</>;
}

/**
 * Pane content for the "Discover" tool. Shows the user's notes for the current
 * chapter, plus discovered cross references, study notes, and content for the
 * currently selected reader tab.
 *
 * Rendered inside the managed side pane (`SidePane`), so the pane shell supplies
 * the surrounding chrome — the title/close (`PaneHeader`), the docking layout,
 * and the mobile-fullscreen behavior. This component just renders the content.
 */
export function DiscoverPane(props: DiscoverPaneProps) {
  const { tabs, playlists, annotations, modals } = props;
  const { actualView } = playlists;

  if (actualView.value === "create_playlist") {
    return (
      <CreatePlaylistForm
        playlists={playlists}
        tabs={tabs}
        modals={modals}
        os={props.state.os}
        login={props.state.login}
        gallery={props.state.gallery}
      />
    );
  }

  if (actualView.value === "create_annotation") {
    return (
      <CreateAnnotationForm
        annotations={annotations}
        tabs={tabs}
        toast={props.toast}
      />
    );
  }

  if (actualView.value === "play_playlist") {
    return (
      <PlayPlaylistView
        state={props.state}
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
    <div className="sb-discover-pane">
      <AnnotationsSection
        tab={selectedTab}
        annotations={annotations}
        modals={modals}
        toast={props.toast}
        login={props.state.login}
        tabs={tabs}
        discover={props.state.discover}
        panes={props.state.panes}
        onReferenceClick={props.state.app.openVerseReference}
      />

      <CrossReferencesSection tab={selectedTab} />
      <StudyNotesSection tab={selectedTab} />
      <ContentSection
        tab={selectedTab}
        contentTypes={props.state.discover.contentTypes.value}
      />

      {/* This pane has no filter chips, so registered types get collapsible
          sections instead — folded to start with when they're hidden by
          default, which is how they stay out of the way until asked for. */}
      {props.state.discover.contentTypes.value.map((definition) => (
        <ContentTypeSection
          key={definition.id}
          tab={selectedTab}
          definition={definition}
          collapsible
        />
      ))}
    </div>
  );
}
