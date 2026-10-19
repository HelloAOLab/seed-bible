import "./PlaylistEditorScreen.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { ChatsManager } from "../../managers/ChatsManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { v4 as uuid } from "uuid";
import { translateTitle } from "../../app/utils";
import { MaterialIcon } from "../icons";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import { PlaylistItemInput } from "../PlaylistItemInput/PlaylistItemInput";
import { playlistItemLabel } from "../playlistItemLabel";
import { playlistItemKind } from "../playlistItemSubtitle";
import {
  PlaylistCoverField,
  PlaylistDescriptionField,
  requestCancelPlaylistEditor,
} from "../CreatePlaylistForm/CreatePlaylistForm";
import { usePlaylistEditor } from "./usePlaylistEditor";
import { PlaylistEditorStepList } from "./PlaylistEditorStepList";

/** Pane title; the screen draws its own header, so this only names the pane. */
export function PlaylistEditorScreenTitle(props: {
  playlists: PlaylistManager;
}) {
  const { t } = useI18n();
  return (
    <>
      {props.playlists.editingPlaylist.value?.title ||
        t("playlist-editor", { defaultValue: "Playlist editor" })}
    </>
  );
}

interface PlaylistEditorScreenProps {
  state: SeedBibleState;
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  chats: ChatsManager;
  openChatPanel: () => void;
}

/**
 * The fullscreen playlist editor, for screens wide enough to show it: the
 * steps down the left, the open step's editor in the middle (or the
 * playlist's own details when no step is open), and the step's settings on
 * the right. Phones get the one-column `CreatePlaylistForm` in the Discover
 * pane instead; the two share their editing state through
 * `usePlaylistEditor`.
 */
export function PlaylistEditorScreen(props: PlaylistEditorScreenProps) {
  const { state, playlists, tabs, modals, chats, openChatPanel } = props;
  const { t } = useI18n();
  const editor = usePlaylistEditor({
    playlists,
    tabs,
    modals,
    bibleData: state.bibleData,
  });
  const {
    editing,
    items,
    saving,
    openIndex,
    openItem,
    setOpenIndex,
    addOpen,
    setAddOpen,
    addInputRef,
    editInputRef,
    books,
    resolveBookName,
    loadChapter,
    requestOpen,
    requestCloseAdd,
    removeItem,
    stepNumbers,
    stepCount,
    addScene,
    handleSave,
    hasUnsavedItemInput,
  } = editor;

  const providers = chats.providers.value.filter((p) => p.supportsToolCalling);
  const singleProvider = providers.length === 1 ? providers[0] : undefined;
  // Opens the chat panel on a fresh local chat seeded with an invitation to
  // say what should change; the playlist-editing tools are already offered
  // to every chat while a playlist is being edited.
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
  const aiButtonLabel = t("ai", { defaultValue: "AI" });
  const aiButtonAriaLabel = t("ai-edit-playlist", {
    defaultValue: "Edit playlist with AI",
  });

  /** Opens the add box in the middle column, closing any open step first. */
  const startAdding = () => {
    if (openIndex !== null) {
      requestOpen(null);
    }
    setAddOpen(true);
  };

  const openStepNumber = openIndex !== null ? stepNumbers.get(openIndex) : null;

  return (
    <div className="sb-playlist-editor">
      <header className="sb-playlist-editor-header">
        <button
          type="button"
          className="sb-reading-plans-back sb-playlist-editor-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() =>
            requestCancelPlaylistEditor(
              playlists,
              modals,
              hasUnsavedItemInput()
            )
          }
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <div className="sb-playlist-editor-heading">
          <input
            className="sb-playlist-editor-title"
            type="text"
            value={editing?.title ?? ""}
            dir="auto"
            aria-label={t("playlist-title_placeholder", {
              defaultValue: "Playlist title",
            })}
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
          <span className="sb-playlist-editor-summary">
            {t("playlist-editor-step-count", {
              defaultValue: "{{count}} steps",
              count: stepCount,
            })}
          </span>
        </div>
        {providers.length > 1 ? (
          <ContextMenuWithButton
            buttonClassName="sb-discover-title-ai"
            aria-label={aiButtonAriaLabel}
            title={aiButtonLabel}
            icon={<MaterialIcon>auto_awesome</MaterialIcon>}
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
        ) : singleProvider ? (
          <button
            type="button"
            className="sb-discover-title-ai"
            aria-label={aiButtonAriaLabel}
            title={aiButtonLabel}
            onClick={() => startAiChat(singleProvider.id)}
          >
            <MaterialIcon>auto_awesome</MaterialIcon>
          </button>
        ) : null}
        <button
          type="button"
          className="sb-reading-plans-back"
          onClick={() =>
            requestCancelPlaylistEditor(
              playlists,
              modals,
              hasUnsavedItemInput()
            )
          }
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? t("saving", { defaultValue: "Saving…" })
            : t("save", { defaultValue: "Save" })}
        </button>
      </header>

      <div className="sb-playlist-editor-columns">
        <aside
          className="sb-playlist-editor-steps"
          aria-label={t("playlist-editor-steps", { defaultValue: "Steps" })}
        >
          <div className="sb-playlist-editor-column-head">
            <span>{t("playlist-editor-steps", { defaultValue: "Steps" })}</span>
            <span className="sb-playlist-editor-column-count">{stepCount}</span>
          </div>
          <button
            type="button"
            className={`sb-playlist-editor-details-row${
              openIndex === null && !addOpen
                ? " sb-playlist-editor-details-row--selected"
                : ""
            }`}
            onClick={() => {
              setAddOpen(false);
              requestOpen(null);
            }}
          >
            <MaterialIcon>info</MaterialIcon>
            {t("playlist-editor-details", {
              defaultValue: "Playlist details",
            })}
          </button>
          {items.length > 0 ? (
            <PlaylistEditorStepList editor={editor} caret={false} />
          ) : (
            <p className="sb-playlist-editor-empty">
              {t("playlist-items-empty", { defaultValue: "No items yet." })}
            </p>
          )}
          <button
            type="button"
            className="sb-playlist-add-toggle"
            onClick={startAdding}
          >
            <MaterialIcon>add</MaterialIcon>
            {t("playlist-add-step", { defaultValue: "Add step" })}
          </button>
          <button
            type="button"
            className="sb-playlist-add-scene"
            onClick={addScene}
          >
            <MaterialIcon>add</MaterialIcon>
            {t("playlist-add-scene", { defaultValue: "Add scene" })}
          </button>
        </aside>

        <main
          className="sb-playlist-editor-main"
          aria-label={
            openItem
              ? t("playlist-editor-step-n", {
                  defaultValue: "Step {{number}}",
                  number: openStepNumber ?? "",
                })
              : t("playlist-editor-details", {
                  defaultValue: "Playlist details",
                })
          }
        >
          {openItem && openIndex !== null ? (
            <div className="sb-playlist-editor-step">
              <p className="sb-playlist-editor-eyebrow">
                {openItem.type === "scene"
                  ? t("playlist-item-scene", { defaultValue: "Scene" })
                  : t("playlist-editor-step-n", {
                      defaultValue: "Step {{number}}",
                      number: openStepNumber ?? "",
                    })}
                {" · "}
                {playlistItemKind(openItem, t)}
              </p>
              <PlaylistItemInput
                ref={editInputRef}
                // Remount when the open item changes so the sub-inputs seed
                // fresh values from it.
                key={`edit-${openIndex}`}
                id={`sb-playlist-item-editor-${openIndex}`}
                books={books}
                onAdd={(added) => playlists.addEditingPlaylistItem(added)}
                editItem={openItem}
                editScriptureText={
                  openItem.type === "bible-verse"
                    ? playlistItemLabel(openItem, t, resolveBookName)
                    : undefined
                }
                loadChapter={loadChapter}
                onUpdate={(updated) => {
                  playlists.updateEditingPlaylistItem(openIndex, updated);
                  setOpenIndex(null);
                }}
                onCancelEdit={() => setOpenIndex(null)}
              />
            </div>
          ) : addOpen ? (
            <div className="sb-playlist-editor-step">
              <PlaylistItemInput
                ref={addInputRef}
                books={books}
                onAdd={(item) => playlists.addEditingPlaylistItem(item)}
              />
              <button
                type="button"
                className="sb-reading-plans-back sb-playlist-add-done"
                onClick={requestCloseAdd}
              >
                {t("done", { defaultValue: "Done" })}
              </button>
            </div>
          ) : (
            <div className="sb-playlist-editor-details">
              <h2 className="sb-playlist-editor-details-title">
                {t("playlist-editor-details", {
                  defaultValue: "Playlist details",
                })}
              </h2>
              <label className="sb-playlist-editor-field">
                <span className="sb-playlist-editor-field-label">
                  {t("description", { defaultValue: "Description" })}
                </span>
                <PlaylistDescriptionField playlists={playlists} />
              </label>
              <div className="sb-playlist-editor-field">
                <span className="sb-playlist-editor-field-label">
                  {t("hero-image", { defaultValue: "Cover image" })}
                </span>
                <PlaylistCoverField
                  playlists={playlists}
                  modals={modals}
                  os={state.os}
                  login={state.login}
                  gallery={state.gallery}
                />
              </div>
            </div>
          )}
        </main>

        <aside
          className="sb-playlist-editor-settings"
          aria-label={t("playlist-editor-step-settings", {
            defaultValue: "Step settings",
          })}
        >
          <div className="sb-playlist-editor-column-head">
            <span>
              {t("playlist-editor-step-settings", {
                defaultValue: "Step settings",
              })}
            </span>
          </div>
          {openItem && openIndex !== null ? (
            <>
              <dl className="sb-playlist-editor-facts">
                <div>
                  <dt>
                    {t("playlist-add-mode-label", {
                      defaultValue: "Item type",
                    })}
                  </dt>
                  <dd>{playlistItemKind(openItem, t)}</dd>
                </div>
                {openStepNumber ? (
                  <div>
                    <dt>
                      {t("playlist-editor-position", {
                        defaultValue: "Position",
                      })}
                    </dt>
                    <dd>
                      {t("playlist-step-of", {
                        defaultValue: "Step {{step}} of {{total}}",
                        step: openStepNumber,
                        total: stepCount,
                      })}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <button
                type="button"
                className="sb-playlist-editor-delete"
                onClick={() => removeItem(openIndex)}
              >
                <MaterialIcon>delete</MaterialIcon>
                {openItem.type === "scene"
                  ? t("playlist-editor-delete-scene", {
                      defaultValue: "Delete scene",
                    })
                  : t("playlist-editor-delete-step", {
                      defaultValue: "Delete step",
                    })}
              </button>
            </>
          ) : (
            <p className="sb-playlist-editor-empty">
              {t("playlist-editor-no-step", {
                defaultValue: "Select a step to see its settings.",
              })}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
