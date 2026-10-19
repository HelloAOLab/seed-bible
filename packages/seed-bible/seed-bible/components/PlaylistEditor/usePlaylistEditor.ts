import { useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type {
  PlaylistItemData,
  PlaylistManager,
} from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { BibleDataManager } from "../../managers/BibleDataManager";
import type { PlaylistItemInputHandle } from "../PlaylistItemInput/PlaylistItemInput";
import { openUnsavedItemConfirm } from "../PlaylistItemInput/unsavedItemConfirm";
import { useDragReorder } from "../useDragReorder";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import type { StepLinkTarget } from "../TipTapEditor/TipTapEditor";
import { playlistItemLabel } from "../playlistItemLabel";
import { publishChecks, type PublishCheck } from "./publishChecks";
import type { AddMode } from "../PlaylistItemInput/PlaylistItemInput";

export interface UsePlaylistEditorOptions {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  /** Loads chapter text for the inline scripture previews. */
  bibleData?: Pick<BibleDataManager, "getTranslationBookChapter">;
  /**
   * Saves an open step's edits when another step is opened, instead of
   * asking. The fullscreen editor edits in place with no save button, so
   * leaving a step is what keeps it.
   */
  autoCommit?: boolean;
}

/**
 * The editing state shared by the playlist editor's two layouts, the side
 * pane's single column and the fullscreen screen: which step is open for
 * editing, whether the "Add item" box is out, the unsaved-edit prompts that
 * guard switching steps and saving, drag-to-reorder of the steps, and the
 * helpers that label and preview them. The playlist itself lives on the
 * manager (`editingPlaylist`); this owns only the editor's own state.
 */
export function usePlaylistEditor(options: UsePlaylistEditorOptions) {
  const { playlists, tabs, modals, bibleData, autoCommit } = options;
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  // Index of the item open for editing, or null when none is. Only one item
  // is open at a time; opening another closes it.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Whether the "Add item" box is out. It's folded away until asked for, so a
  // long list isn't followed by a form nobody asked for.
  const [addOpen, setAddOpen] = useState(false);
  // Where the next added step goes: after this item, or at the end when null.
  const [insertAfter, setInsertAfter] = useState<number | null>(null);
  // The item the next added step replaces, when the author changed a step's
  // kind: the new step takes its place and its settings.
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  // The kind the add box opens on, when the author picked one up front.
  const [addMode, setAddMode] = useState<AddMode | undefined>(undefined);
  const addInputRef = useRef<PlaylistItemInputHandle>(null);
  // The editor of the open item.
  const editInputRef = useRef<PlaylistItemInputHandle>(null);

  // The playlist being edited is owned by the manager; edits update the signal.
  const editing = playlists.editingPlaylist.value;
  const items: PlaylistItemData[] = editing?.items ?? [];

  // The item currently open, resolved from its index. Null when none is open
  // or when the index no longer points at an item.
  const openItem = openIndex !== null ? (items[openIndex] ?? null) : null;

  // Resolve verse book IDs to full book names using the selected tab's loaded
  // translation, when available. Falls back to the raw book ID otherwise.
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  // Scripture without a pinned translation previews in the one being read.
  const loadChapter: ScriptureChapterLoader | undefined = bibleData
    ? async (translationId, bookId, chapter) => {
        const translation =
          translationId ?? selectedTab?.readingState.translationId.peek();
        if (!translation) {
          throw new Error("No translation to preview scripture in.");
        }
        return bibleData.getTranslationBookChapter(
          translation,
          bookId,
          chapter
        );
      }
    : undefined;

  const { getRowClassName, getHandleProps } = useDragReorder({
    itemCount: items.length,
    onReorder: (from, to) => {
      playlists.reorderEditingPlaylistItem(from, to);
      // Keep the open item pointed at the same logical item, mirroring the
      // arithmetic `reorderQueue` already applies to `currentIndex`.
      setOpenIndex((current) => {
        if (current === null) return null;
        if (current === from) return to;
        if (from < current && to >= current) return current - 1;
        if (from > current && to <= current) return current + 1;
        return current;
      });
    },
  });

  /** Commits the open item's edits. Resolves to whether they were saved. */
  const saveOpenItem = async (): Promise<boolean> =>
    (await editInputRef.current?.commit()) ?? false;

  /**
   * Closes the open item, or opens `index` instead of it, asking first when
   * the open item has edits that haven't been saved. Saving an invalid edit
   * (say, an unknown reference) leaves the item open with its error showing.
   */
  const requestOpen = (index: number | null) => {
    if (index === openIndex) {
      return;
    }
    if (openIndex !== null && editInputRef.current?.isDirty() && autoCommit) {
      void saveOpenItem().then((saved) => {
        if (saved) {
          setOpenIndex(index);
        }
      });
      return;
    }
    if (openIndex !== null && editInputRef.current?.isDirty()) {
      openUnsavedItemConfirm(modals, {
        kind: "edit",
        then: "close",
        onDiscard: () => setOpenIndex(index),
        onKeep: () => {
          void saveOpenItem().then((saved) => {
            if (saved) {
              setOpenIndex(index);
            }
          });
        },
      });
      return;
    }
    setOpenIndex(index);
  };

  /**
   * Folds the "Add item" box away, asking first when it holds a draft that
   * hasn't been added. Adding an invalid draft leaves the box open with its
   * error showing.
   */
  const requestCloseAdd = () => {
    if (!addInputRef.current?.isDirty()) {
      setAddOpen(false);
      return;
    }
    openUnsavedItemConfirm(modals, {
      kind: "add",
      then: "close",
      onDiscard: () => setAddOpen(false),
      onKeep: () => {
        void (async () => {
          if (await addInputRef.current?.commit()) {
            setAddOpen(false);
          }
        })();
      },
    });
  };

  /**
   * Adds the step the add box assembled: in place of the step whose kind was
   * changed (keeping that step's settings), after the open step, or at the
   * end. Returns where it landed.
   */
  const addItem = (item: PlaylistItemData): number => {
    if (replaceIndex !== null && items[replaceIndex]) {
      const old = items[replaceIndex]!;
      const settings =
        old.type !== "scene"
          ? {
              ...(old.minutes ? { minutes: old.minutes } : {}),
              ...(old.pause ? { pause: old.pause } : {}),
              ...(old.leaderOnly ? { leaderOnly: old.leaderOnly } : {}),
            }
          : {};
      playlists.updateEditingPlaylistItem(
        replaceIndex,
        item.type === "scene" ? item : { ...settings, ...item }
      );
      setReplaceIndex(null);
      return replaceIndex;
    }
    if (insertAfter !== null && insertAfter < items.length - 1) {
      playlists.insertEditingPlaylistItem(insertAfter + 1, item);
      setInsertAfter(insertAfter + 1);
      return insertAfter + 1;
    }
    playlists.addEditingPlaylistItem(item);
    return items.length;
  };

  /**
   * Opens the add box for a step after `after` (the open step by default),
   * on `mode` when given, or, with `replace`, for a step that takes that
   * item's place.
   */
  const startAdding = (
    options: { after?: number | null; mode?: AddMode; replace?: number } = {}
  ) => {
    const proceed = () => {
      setReplaceIndex(options.replace ?? null);
      setInsertAfter(
        options.replace !== undefined
          ? null
          : options.after !== undefined
            ? options.after
            : openIndex
      );
      setAddMode(options.mode);
      setAddOpen(true);
    };
    if (openIndex !== null) {
      if (editInputRef.current?.isDirty() && autoCommit) {
        void saveOpenItem().then((saved) => {
          if (saved) {
            setOpenIndex(null);
            proceed();
          }
        });
        return;
      }
      requestOpen(null);
    }
    proceed();
  };

  /** Patches the open step's settings (its length, pause, leader-only). */
  const updateOpenItemSettings = (patch: {
    minutes?: number | null;
    pause?: boolean;
    leaderOnly?: boolean;
  }) => {
    if (openIndex === null || !openItem || openItem.type === "scene") {
      return;
    }
    const next = { ...openItem } as typeof openItem & {
      minutes?: number;
      pause?: boolean;
      leaderOnly?: boolean;
    };
    if (patch.minutes !== undefined) {
      if (patch.minutes === null) {
        delete next.minutes;
      } else {
        next.minutes = patch.minutes;
      }
    }
    if (patch.pause !== undefined) {
      if (patch.pause) next.pause = true;
      else delete next.pause;
    }
    if (patch.leaderOnly !== undefined) {
      if (patch.leaderOnly) next.leaderOnly = true;
      else delete next.leaderOnly;
    }
    playlists.updateEditingPlaylistItem(openIndex, next);
  };

  // What to look at on each step, from the publish checks, so the list can
  // flag a step and its settings can explain.
  const stepIssues = new Map<number, PublishCheck[]>();
  for (const check of publishChecks(items, books, t, resolveBookName)) {
    if (check.ok || check.itemIndex === undefined) {
      continue;
    }
    stepIssues.set(check.itemIndex, [
      ...(stepIssues.get(check.itemIndex) ?? []),
      check,
    ]);
  }

  /** Removes the item at `index`, keeping the open item pointed at the same item. */
  const removeItem = (index: number) => {
    playlists.removeEditingPlaylistItem(index);
    // Close the editor when the open item itself was removed.
    setOpenIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  };

  // Scenes are headings, not steps: steps are numbered past them.
  const stepNumbers = new Map<number, number>();
  let stepCount = 0;
  items.forEach((item, index) => {
    if (item.type !== "scene") {
      stepCount += 1;
      stepNumbers.set(index, stepCount);
    }
  });
  // What a text item or note can link to: every step, by its number.
  const stepLinkTargets: StepLinkTarget[] = items.flatMap((item, index) => {
    const number = stepNumbers.get(index);
    return number
      ? [{ number, label: playlistItemLabel(item, t, resolveBookName) }]
      : [];
  });

  /** Adds a scene heading at the end of the list and opens it for naming. */
  const addScene = () => {
    const sceneCount = items.filter((item) => item.type === "scene").length;
    const index = items.length;
    playlists.addEditingPlaylistItem({
      type: "scene",
      title: t("playlist-scene-default", {
        defaultValue: "Scene {{number}}",
        number: sceneCount + 1,
      }),
    });
    requestOpen(index);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await playlists.saveEditingPlaylist();
    } catch (error) {
      console.error("Failed to save playlist:", error);
      setSaving(false);
    }
  };

  /** Saves the playlist, asking first about any item input not yet in it. */
  const handleSave = () => {
    if (saving) {
      return;
    }
    // Either an open item's unsaved edits or a new item not yet added would
    // otherwise be silently lost by saving the playlist.
    const editDirty = openItem !== null && !!editInputRef.current?.isDirty();
    const addDirty = !!addInputRef.current?.isDirty();
    if (editDirty && !addDirty && autoCommit) {
      void saveOpenItem().then((saved) => {
        if (saved) {
          void doSave();
        }
      });
      return;
    }
    if (editDirty || addDirty) {
      const input = editDirty ? editInputRef : addInputRef;
      openUnsavedItemConfirm(modals, {
        kind: editDirty ? "edit" : "add",
        then: "save",
        onDiscard: () => void doSave(),
        onKeep: () => {
          void (async () => {
            const committed = await input.current?.commit();
            if (committed) {
              await doSave();
            }
            // If commit() failed (e.g. invalid input), leave the user in the
            // form with their draft and its inline error still visible.
          })();
        },
      });
      return;
    }
    void doSave();
  };

  /** Whether an item input holds something the playlist doesn't have yet. */
  const hasUnsavedItemInput = () =>
    (addInputRef.current?.isDirty() ?? false) ||
    (openItem !== null && (editInputRef.current?.isDirty() ?? false));

  return {
    editing,
    items,
    saving,
    openIndex,
    setOpenIndex,
    openItem,
    addOpen,
    setAddOpen,
    addMode,
    insertAfter,
    replaceIndex,
    addItem,
    startAdding,
    updateOpenItemSettings,
    stepIssues,
    saveOpenItem,
    addInputRef,
    editInputRef,
    books,
    resolveBookName,
    loadChapter,
    getRowClassName,
    getHandleProps,
    requestOpen,
    requestCloseAdd,
    removeItem,
    stepNumbers,
    stepCount,
    stepLinkTargets,
    addScene,
    handleSave,
    hasUnsavedItemInput,
  };
}

export type PlaylistEditorState = ReturnType<typeof usePlaylistEditor>;
