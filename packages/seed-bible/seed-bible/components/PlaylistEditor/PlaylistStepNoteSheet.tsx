import "../ScriptureNote/ScriptureNote.css";
import "./PlaylistEditor.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import {
  hasScriptureNote,
  type PlaylistItemData,
} from "../../managers/PlaylistManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";
import { NoteHeading } from "../ScriptureNote/ScriptureNote";
import { PlaylistNoteComposer } from "./PlaylistNoteComposer";
import { useOtherSteps } from "./PlaylistEditorWorkspace";

type ScriptureItem = Extract<PlaylistItemData, { type: "bible-verse" }>;

/**
 * Phone: the open scripture step's note, in a sheet riding on the chapter
 * pill and dressed like the note playback shows there. Collapsed, it reads
 * like the player's (or "Add note" when there's none); opened, it edits the
 * note's title and text, with Remove note at the bottom.
 */
export function PlaylistStepNoteSheet(props: {
  state: SeedBibleState;
  index: number;
  item: ScriptureItem;
  resolveBookName: (bookId: string) => string;
}) {
  const { state, index, item, resolveBookName } = props;
  const { playlists } = state;
  const { t, isRtl } = useI18n();
  const [open, setOpen] = useState(false);
  const otherSteps = useOtherSteps(state, index);
  const hasNote = hasScriptureNote(item);
  const label = playlistItemLabel(item, t, resolveBookName);

  // Re-read at each edit: the title and the text are typed separately.
  const update = (changes: Partial<ScriptureItem>) => {
    const current = playlists.editingPlaylist.peek()?.items[index];
    if (current?.type === "bible-verse") {
      playlists.updateEditingPlaylistItem(index, { ...current, ...changes });
    }
  };

  return (
    <section
      // The nav it rides on follows the Bible translation's direction; the
      // note's frame is part of the UI.
      dir={isRtl ? "rtl" : "ltr"}
      className={`sb-scripture-note-sheet sb-pe-note-sheet${
        open ? " sb-pe-note-sheet--open" : " sb-scripture-note-sheet--collapsed"
      }`}
      aria-label={t("playlist-scripture-note-aria", {
        defaultValue: "Note on {{passage}}",
        passage: label,
      })}
    >
      <div className="sb-scripture-note-sheet-bar">
        <button
          type="button"
          className="sb-scripture-note-sheet-header"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <MaterialIcon className="sb-scripture-note-sheet-icon">
            sticky_note_2
          </MaterialIcon>
          {hasNote ? (
            <NoteHeading title={item.noteTitle} passage={label} as="span" />
          ) : (
            <span className="sb-scripture-note-title">
              {t("playlist-editor-note-add", { defaultValue: "Add note" })}
            </span>
          )}
          <MaterialIcon className="sb-scripture-note-sheet-chevron">
            {open ? "expand_more" : "expand_less"}
          </MaterialIcon>
        </button>
      </div>
      {open ? (
        <div className="sb-scripture-note-body sb-pe sb-pe-note-sheet-body">
          <div className="sb-pe-field">
            <label
              className="sb-pe-field-label"
              htmlFor="sb-pe-note-sheet-title"
            >
              {t("playlist-editor-title", { defaultValue: "Title" })}
            </label>
            <input
              id="sb-pe-note-sheet-title"
              className="sb-pe-input"
              type="text"
              dir="auto"
              value={item.noteTitle ?? ""}
              placeholder={t("playlist-editor-note-title", {
                defaultValue: "Note title",
              })}
              onInput={(event) => {
                const value = event.currentTarget.value;
                update({ noteTitle: value.trim() ? value : undefined });
              }}
            />
          </div>
          <PlaylistNoteComposer
            key={index}
            initialHtml={item.note ?? ""}
            autofocus={!hasNote}
            boxed
            placeholder={t("playlist-editor-scripture-note-placeholder", {
              defaultValue:
                "Add a note readers see with this passage (optional)",
            })}
            steps={otherSteps}
            onChange={(html) => update({ note: html || undefined })}
          />
          {hasNote ? (
            <button
              type="button"
              className="sb-pe-note-remove"
              onClick={() => {
                update({ note: undefined, noteTitle: undefined });
                setOpen(false);
              }}
            >
              {t("playlist-editor-note-remove", {
                defaultValue: "Remove note",
              })}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
