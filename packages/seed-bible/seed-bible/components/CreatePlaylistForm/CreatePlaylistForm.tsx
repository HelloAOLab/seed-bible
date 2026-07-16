import "./CreatePlaylistForm.css";
import { useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import { MaterialIcon } from "../icons";
import {
  DiscoverSection,
  DiscoverEmpty,
} from "../DiscoverPane/DiscoverSection";
import {
  PlaylistItemInput,
  type PlaylistItemInputHandle,
} from "../PlaylistItemInput/PlaylistItemInput";
import { playlistItemLabel } from "../playlistItemLabel";
import { playlistItemIcon } from "../playlistItemIcon";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableRow } from "../SortableRow";
import { resolveReorderIndices } from "../resolveReorderIndices";
import { useListReorderSensors } from "../useListReorderSensors";
import { useStableListIds } from "../useStableListIds";

interface CreatePlaylistFormProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
}

const UNSAVED_ITEM_CONFIRM_MODAL_ID = "playlist-unsaved-item-confirm";

/**
 * Confirmation body shown when Save is clicked while the "Add item" section
 * has in-progress, un-added content, so it isn't silently discarded.
 */
function UnsavedItemConfirmModalContent(props: {
  onGoBack: () => void;
  onDiscardAndSave: () => void;
  onAddAndSave: () => void;
}) {
  const { onGoBack, onDiscardAndSave, onAddAndSave } = props;
  const { t } = useI18n();

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("unsaved-item-confirm-message", {
          defaultValue:
            "You've started adding an item that hasn't been added to the playlist yet. What would you like to do?",
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onGoBack}
        >
          {t("back", { defaultValue: "Back" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onDiscardAndSave}
        >
          {t("discard-and-save", { defaultValue: "Discard and save" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={onAddAndSave}
        >
          {t("add-and-save", { defaultValue: "Add and save" })}
        </button>
      </div>
    </div>
  );
}

/** Opens the unsaved-item confirmation modal. */
function openUnsavedItemConfirm(
  modals: ModalManager,
  onDiscardAndSave: () => void,
  onAddAndSave: () => void
) {
  modals.openModal({
    id: UNSAVED_ITEM_CONFIRM_MODAL_ID,
    title: {
      key: "unsaved-item-confirm-title",
      defaultValue: "Unsaved item",
    },
    content: () => (
      <UnsavedItemConfirmModalContent
        onGoBack={() => modals.closeModal(UNSAVED_ITEM_CONFIRM_MODAL_ID)}
        onDiscardAndSave={() => {
          modals.closeModal(UNSAVED_ITEM_CONFIRM_MODAL_ID);
          onDiscardAndSave();
        }}
        onAddAndSave={() => {
          modals.closeModal(UNSAVED_ITEM_CONFIRM_MODAL_ID);
          onAddAndSave();
        }}
      />
    ),
  });
}

/**
 * Builds the Items list's `onDragEnd` handler. Exported so tests can call it
 * directly with a fake `{active, over}` event instead of simulating a full
 * drag gesture through dnd-kit's sensors.
 */
export function createPlaylistItemsDragEndHandler(
  ids: readonly (string | number)[],
  reorderEditingPlaylistItem: (from: number, to: number) => void,
  setEditingIndex: (updater: (current: number | null) => number | null) => void
) {
  return (event: DragEndEvent) => {
    const indices = resolveReorderIndices(event, ids);
    if (!indices) {
      return;
    }
    const { from, to } = indices;
    reorderEditingPlaylistItem(from, to);
    // Keep the edit target pointed at the same logical item, mirroring the
    // arithmetic `reorderQueue` already applies to `currentIndex`.
    setEditingIndex((current) => {
      if (current === null) return null;
      if (current === from) return to;
      if (from < current && to >= current) return current - 1;
      if (from > current && to <= current) return current + 1;
      return current;
    });
  };
}

/** Create-playlist screen shown inside the discover pane. */
export function CreatePlaylistForm(props: CreatePlaylistFormProps) {
  const { playlists, tabs, modals } = props;
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  // Index of the item currently open for editing in the input section below, or
  // null when the section is adding a new item.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRef = useRef<PlaylistItemInputHandle>(null);

  // The playlist being edited is owned by the manager; edits update the signal.
  const editing = playlists.editingPlaylist.value;

  // The item currently open for editing, resolved from the selected index. Null
  // when adding a new item or when the index no longer points at an item.
  const editingItem =
    editingIndex !== null ? (editing?.items[editingIndex] ?? null) : null;

  // Resolve verse book IDs to full book names using the selected tab's loaded
  // translation, when available. Falls back to the raw book ID otherwise.
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const sensors = useListReorderSensors();
  const itemIds = useStableListIds(editing?.items ?? []);
  const handleDragEnd = createPlaylistItemsDragEndHandler(
    itemIds,
    playlists.reorderEditingPlaylistItem,
    setEditingIndex
  );

  const doSave = async () => {
    setSaving(true);
    try {
      await playlists.saveEditingPlaylist();
    } catch (error) {
      console.error("Failed to save playlist:", error);
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (saving) {
      return;
    }
    // Only guards the "add new item" flow, not being mid-edit of an existing
    // item — the Add Item section is what silently loses content today.
    if (editingIndex === null && inputRef.current?.isDirty()) {
      openUnsavedItemConfirm(
        modals,
        () => void doSave(),
        () => {
          void (async () => {
            const added = await inputRef.current?.commit();
            if (added) {
              await doSave();
            }
            // If commit() failed (e.g. invalid input), leave the user in the
            // form with their draft and its inline error still visible.
          })();
        }
      );
      return;
    }
    void doSave();
  };

  return (
    <div className="sb-discover-pane">
      <DiscoverSection title={t("items", { defaultValue: "Items" })}>
        {!editing?.items.length ? (
          <DiscoverEmpty
            text={t("playlist-items-empty", { defaultValue: "No items yet." })}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <ul className="sb-discover-list">
                {editing.items.map((item, index) => (
                  <SortableRow
                    key={itemIds[index]}
                    id={itemIds[index]!}
                    className={
                      "sb-discover-item sb-discover-item--row" +
                      (index === editingIndex
                        ? " sb-discover-item--editing"
                        : "")
                    }
                  >
                    {(handleProps) => (
                      <>
                        <button
                          type="button"
                          className="sb-discover-item-drag-handle"
                          aria-label={t("drag-to-reorder-playlist-item", {
                            defaultValue: "Drag to reorder",
                          })}
                          {...handleProps}
                        >
                          <MaterialIcon>drag_indicator</MaterialIcon>
                        </button>
                        <button
                          type="button"
                          className="sb-discover-item-button"
                          aria-label={t("edit-playlist-item", {
                            defaultValue: "Edit item",
                          })}
                          aria-current={index === editingIndex}
                          onClick={() => setEditingIndex(index)}
                        >
                          <MaterialIcon className="sb-discover-item-icon">
                            {playlistItemIcon(item)}
                          </MaterialIcon>
                          <span className="sb-discover-item-title" dir="auto">
                            {playlistItemLabel(item, t, resolveBookName)}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="sb-discover-item-delete"
                          aria-label={t("remove-playlist-item", {
                            defaultValue: "Remove item",
                          })}
                          onClick={() => {
                            playlists.removeEditingPlaylistItem(index);
                            // Keep the edit target pointed at the same item, or
                            // drop out of editing when the edited item itself
                            // was removed.
                            setEditingIndex((current) => {
                              if (current === null) return null;
                              if (current === index) return null;
                              return current > index ? current - 1 : current;
                            });
                          }}
                        >
                          <MaterialIcon>delete</MaterialIcon>
                        </button>
                      </>
                    )}
                  </SortableRow>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </DiscoverSection>

      <PlaylistItemInput
        ref={inputRef}
        // Remount when the edit target changes so the sub-inputs seed fresh
        // values from the newly-selected item (or reset for adding).
        key={editingItem ? `edit-${editingIndex}` : "add"}
        books={books}
        onAdd={(item) => playlists.addEditingPlaylistItem(item)}
        editItem={editingItem ?? undefined}
        editScriptureText={
          editingItem?.type === "bible-verse"
            ? playlistItemLabel(editingItem, t, resolveBookName)
            : undefined
        }
        onUpdate={(item) => {
          if (editingIndex !== null) {
            playlists.updateEditingPlaylistItem(editingIndex, item);
          }
          setEditingIndex(null);
        }}
        onCancelEdit={() => setEditingIndex(null)}
      />

      <div>
        <button
          type="button"
          className="sb-reading-plans-back"
          onClick={() => playlists.cancelEditingPlaylist()}
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
      </div>
    </div>
  );
}
