import "./PlaylistEditorStepList.css";
import type { ComponentChildren } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";
import {
  playlistItemQueueLine,
  playlistItemSubtitle,
} from "../playlistItemSubtitle";
import type { PlaylistEditorState } from "./usePlaylistEditor";
import type { PublishCheck } from "./publishChecks";

/**
 * The playlist's steps as numbered rows: the list both editor layouts show.
 * A row opens its step; the open row is marked, and `renderEditor` lets the
 * side-pane layout put the step's editor inside the row (the fullscreen
 * layout edits it elsewhere).
 *
 * `fullscreen` is the fullscreen look: each row saying its kind and length,
 * and a warning on a step the publish checks point at.
 */
export function PlaylistEditorStepList(props: {
  editor: Pick<
    PlaylistEditorState,
    | "items"
    | "openIndex"
    | "resolveBookName"
    | "getRowClassName"
    | "getHandleProps"
    | "requestOpen"
    | "removeItem"
  > &
    Partial<Pick<PlaylistEditorState, "stepIssues">>;
  /** Rendered inside the open row, after its buttons; for an in-row editor. */
  renderEditor?: (item: PlaylistItemData, index: number) => ComponentChildren;
  /** Whether the open row shows a caret for its in-row editor. */
  caret?: boolean;
  fullscreen?: boolean;
}) {
  const { editor, renderEditor, caret = true, fullscreen = false } = props;
  const { t } = useI18n();

  const row = (item: PlaylistItemData, index: number) => {
    const isOpen = index === editor.openIndex;
    const editorId = `sb-playlist-item-editor-${index}`;
    const issues: PublishCheck[] = editor.stepIssues?.get(index) ?? [];
    return (
      <li
        key={index}
        className={
          "sb-discover-item sb-discover-item--row sb-playlist-editor-item" +
          (isOpen ? " sb-discover-item--editing" : "") +
          editor.getRowClassName(index)
        }
      >
        <button
          type="button"
          className="sb-discover-item-drag-handle"
          aria-label={t("drag-to-reorder-playlist-item", {
            defaultValue: "Drag to reorder",
          })}
          {...editor.getHandleProps(index)}
        >
          <MaterialIcon>drag_indicator</MaterialIcon>
        </button>
        <button
          type="button"
          className="sb-discover-item-button"
          aria-label={t("edit-playlist-item", {
            defaultValue: "Edit item",
          })}
          aria-current={isOpen}
          aria-expanded={renderEditor ? isOpen : undefined}
          aria-controls={renderEditor && isOpen ? editorId : undefined}
          onClick={() =>
            editor.requestOpen(isOpen && renderEditor ? null : index)
          }
        >
          <span className="sb-playlist-editor-item-number" aria-hidden="true">
            {index + 1}
          </span>
          <span className="sb-playlist-editor-item-text">
            <span className="sb-discover-item-title" dir="auto">
              {playlistItemLabel(item, t, editor.resolveBookName)}
            </span>
            <span className="sb-playlist-editor-item-subtitle" dir="auto">
              {fullscreen
                ? playlistItemQueueLine(item, t)
                : playlistItemSubtitle(item, t, editor.resolveBookName)}
            </span>
          </span>
          {issues.length > 0 ? (
            <MaterialIcon
              className="sb-playlist-editor-item-warning"
              title={issues.map((issue) => issue.message).join("\n")}
              aria-label={t("playlist-editor-step-issue", {
                defaultValue: "Something to look at",
              })}
            >
              warning
            </MaterialIcon>
          ) : null}
          {caret ? (
            <MaterialIcon className="sb-discover-item-caret">
              {isOpen ? "expand_less" : "expand_more"}
            </MaterialIcon>
          ) : null}
        </button>
        {!fullscreen ? (
          <button
            type="button"
            className="sb-discover-item-delete"
            aria-label={t("remove-playlist-item", {
              defaultValue: "Remove item",
            })}
            onClick={() => editor.removeItem(index)}
          >
            <MaterialIcon>delete</MaterialIcon>
          </button>
        ) : null}
        {isOpen && renderEditor ? renderEditor(item, index) : null}
      </li>
    );
  };

  return (
    <ul
      className={`sb-discover-list sb-playlist-step-list${
        fullscreen ? " sb-playlist-step-list--fullscreen" : ""
      }`}
    >
      {editor.items.map(row)}
    </ul>
  );
}
