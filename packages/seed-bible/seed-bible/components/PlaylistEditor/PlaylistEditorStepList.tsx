import "./PlaylistEditorStepList.css";
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
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
 * The playlist's steps as numbered rows, with scenes as headings between
 * them: the list both editor layouts show. A row opens its step; the open
 * row is marked, and `renderEditor` lets the side-pane layout put the
 * step's editor inside the row (the fullscreen layout edits it elsewhere).
 *
 * `grouped` is the fullscreen look: the steps gathered under their scenes,
 * each scene a heading that folds its steps away, the steps before the
 * first scene under "Intro", each row saying its kind and length, and a
 * warning on a step the publish checks point at.
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
  > &
    Partial<Pick<PlaylistEditorState, "stepIssues">>;
  /** Rendered inside the open row, after its buttons; for an in-row editor. */
  renderEditor?: (item: PlaylistItemData, index: number) => ComponentChildren;
  /** Whether the open row shows a caret for its in-row editor. */
  caret?: boolean;
  grouped?: boolean;
}) {
  const { editor, renderEditor, caret = true, grouped = false } = props;
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const row = (item: PlaylistItemData, index: number) => {
    const isOpen = index === editor.openIndex;
    const editorId = `sb-playlist-item-editor-${index}`;
    const issues: PublishCheck[] = editor.stepIssues?.get(index) ?? [];
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
          <span className="sb-playlist-editor-item-number" aria-hidden="true">
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
              {grouped && item.type !== "scene"
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
        {!grouped ? (
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

  if (!grouped) {
    return (
      <ul className="sb-discover-list sb-playlist-step-list">
        {editor.items.map(row)}
      </ul>
    );
  }

  // Each scene heads the steps after it; the steps before the first scene
  // are the intro. Without any scene the list is one plain run.
  const groups: { sceneIndex: number | null; indices: number[] }[] = [];
  editor.items.forEach((item, index) => {
    if (item.type === "scene") {
      groups.push({ sceneIndex: index, indices: [] });
      return;
    }
    if (groups.length === 0) {
      groups.push({ sceneIndex: null, indices: [] });
    }
    groups[groups.length - 1]!.indices.push(index);
  });
  const hasScenes = groups.some((group) => group.sceneIndex !== null);
  let sceneNumber = 0;

  return (
    <div className="sb-playlist-step-groups">
      {groups.map((group) => {
        const scene =
          group.sceneIndex !== null
            ? (editor.items[group.sceneIndex] ?? null)
            : null;
        if (scene) {
          sceneNumber += 1;
        }
        const key = group.sceneIndex ?? -1;
        const isCollapsed = collapsed.has(key);
        const heading = scene
          ? t("playlist-editor-scene-group", {
              defaultValue: "Scene {{number}} · {{title}}",
              number: sceneNumber,
              title: scene.type === "scene" ? scene.title : "",
            })
          : t("playlist-editor-intro-group", { defaultValue: "Intro" });
        const sceneOpen =
          group.sceneIndex !== null && group.sceneIndex === editor.openIndex;
        return (
          <section
            key={key}
            className={`sb-playlist-step-group${
              sceneOpen ? " sb-playlist-step-group--open" : ""
            }`}
          >
            {hasScenes ? (
              <div className="sb-playlist-step-group-head">
                <button
                  type="button"
                  className="sb-playlist-step-group-toggle"
                  aria-expanded={!isCollapsed}
                  aria-label={
                    isCollapsed
                      ? t("playlist-editor-expand-scene", {
                          defaultValue: "Expand scene",
                        })
                      : t("playlist-editor-collapse-scene", {
                          defaultValue: "Collapse scene",
                        })
                  }
                  onClick={() =>
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                >
                  <MaterialIcon>
                    {isCollapsed ? "chevron_right" : "expand_more"}
                  </MaterialIcon>
                </button>
                {scene && group.sceneIndex !== null ? (
                  <button
                    type="button"
                    className="sb-playlist-step-group-title"
                    aria-current={sceneOpen}
                    onClick={() => editor.requestOpen(group.sceneIndex)}
                    dir="auto"
                  >
                    {heading}
                  </button>
                ) : (
                  <span className="sb-playlist-step-group-title" dir="auto">
                    {heading}
                  </span>
                )}
              </div>
            ) : null}
            {!isCollapsed ? (
              <ul className="sb-discover-list sb-playlist-step-list">
                {group.indices.map((index) => row(editor.items[index]!, index))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
