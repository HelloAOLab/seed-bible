import "./PlaylistEditorStepList.css";
import type { ComponentChildren } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";
import { playlistItemSubtitle } from "../playlistItemSubtitle";
import type { PlaylistEditorState } from "./usePlaylistEditor";

/**
 * The playlist's steps as numbered rows, with scenes as headings between
 * them: the list both editor layouts show. A row opens its step; the open
 * row is marked, and `renderEditor` lets the side-pane layout put the
 * step's editor inside the row (the fullscreen layout edits it elsewhere).
 */
export function PlaylistEditorStepList(props: {
  editor: Pick<
    PlaylistEditorState,
    | "items"
    | "openIndex"
    | "stepNumbers"
    | "resolveBookName"
    | "getRowClassName"
    | "getHandleProps"
    | "requestOpen"
    | "removeItem"
  >;
  /** Rendered inside the open row, after its buttons; for an in-row editor. */
  renderEditor?: (item: PlaylistItemData, index: number) => ComponentChildren;
  /** Whether the open row shows a caret for its in-row editor. */
  caret?: boolean;
}) {
  const { editor, renderEditor, caret = true } = props;
  const { t } = useI18n();

  return (
    <ul className="sb-discover-list sb-playlist-step-list">
      {editor.items.map((item, index) => {
        const isOpen = index === editor.openIndex;
        const editorId = `sb-playlist-item-editor-${index}`;
        return (
          <li
            key={index}
            className={
              "sb-discover-item sb-discover-item--row sb-playlist-editor-item" +
              (item.type === "scene" ? " sb-playlist-editor-scene" : "") +
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
              <span
                className="sb-playlist-editor-item-number"
                aria-hidden="true"
              >
                {item.type === "scene" ? (
                  <MaterialIcon>segment</MaterialIcon>
                ) : (
                  editor.stepNumbers.get(index)
                )}
              </span>
              <span className="sb-playlist-editor-item-text">
                <span className="sb-discover-item-title" dir="auto">
                  {playlistItemLabel(item, t, editor.resolveBookName)}
                </span>
                <span className="sb-playlist-editor-item-subtitle" dir="auto">
                  {playlistItemSubtitle(item, t, editor.resolveBookName)}
                </span>
              </span>
              {caret ? (
                <MaterialIcon className="sb-discover-item-caret">
                  {isOpen ? "expand_less" : "expand_more"}
                </MaterialIcon>
              ) : null}
            </button>
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
            {isOpen && renderEditor ? renderEditor(item, index) : null}
          </li>
        );
      })}
    </ul>
  );
}
