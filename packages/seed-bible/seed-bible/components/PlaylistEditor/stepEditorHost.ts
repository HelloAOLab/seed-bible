import type { ComponentChildren } from "preact";
import type { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { StepEditor } from "../../managers/StepEditor";
import type { ReaderTab } from "../../managers/TabsManager";

type Translate = ReturnType<typeof useI18n>["t"];
type ScriptureItem = Extract<PlaylistItemData, { type: "bible-verse" }>;

/**
 * What the step editor is editing: a playlist or a reading plan. The editor's
 * pages are the same for both; this is everything about them that isn't.
 */
export interface StepEditorPanelHost {
  editor: StepEditor;
  /** Its name, or what it's called while it has none. */
  title: (t: Translate) => string;
  /** "Draft - Unsaved changes", "Draft" or "Saved". */
  status: (t: Translate) => { saved: boolean; label: string };
  /** The back button's label on the list, where it leaves the editor. */
  closeLabel: (t: Translate) => string;
  /** Leaves the editor, asking first if there are unsaved changes. */
  requestClose: () => void;
  /** What the title opens, as its tooltip says. */
  editDetailsLabel: (t: Translate) => string;
  /** Where the "Add a step" menu says the new step goes. */
  addMenuPlace: (afterIndex: number, t: Translate) => string;
  /** The list of steps, with its summary. */
  renderSteps: () => ComponentChildren;
}

export interface StepEditorHost extends StepEditorPanelHost {
  /** How long a step is expected to take, in whole minutes. */
  stepMinutes: (item: PlaylistItemData) => number;
  /** A phone's line under the title on the list: its size and status. */
  mobileStatus: (t: Translate) => string;
  /** The sheet or dialog the title opens. */
  details: {
    title: { key: string; defaultValue: string };
    /** Its fields, whose ids start with `idPrefix`. */
    render: (idPrefix: string) => ComponentChildren;
  };
  renderPublishButton: () => ComponentChildren;
}

/** The step editor that takes over this reader tab, or null. */
export function stepEditorOnTab(
  state: SeedBibleState,
  tab: ReaderTab | null | undefined
): StepEditor | null {
  const editor = isPlaylistEditorShowing(state)
    ? state.playlists.stepEditor
    : state.readingPlans.isEditorShowing.value
      ? state.readingPlans.stepEditor
      : null;
  return tab && editor && state.tabs.selectedTabId.value === tab.id
    ? editor
    : null;
}

export function isPlaylistEditorShowing(state: SeedBibleState): boolean {
  return (
    state.playlists.view.value === "create_playlist" &&
    !!state.playlists.editingPlaylist.value
  );
}

/**
 * The open step when it's plain scripture shown over this tab's reader, with
 * its editor and index, or null. Compare steps have their own editor instead.
 */
export function scriptureStepOnTab(
  state: SeedBibleState,
  tab: ReaderTab | null | undefined
): { editor: StepEditor; index: number; item: ScriptureItem } | null {
  const editor = stepEditorOnTab(state, tab);
  if (!editor) {
    return null;
  }
  const index = editor.stepIndex.value;
  const item = editor.items.value[index];
  return item?.type === "bible-verse" && !item.compare
    ? { editor, index, item }
    : null;
}
