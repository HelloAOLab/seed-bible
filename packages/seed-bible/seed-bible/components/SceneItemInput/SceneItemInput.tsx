import { useImperativeHandle, useState } from "preact/hooks";
import { forwardRef } from "preact/compat";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";

interface SceneItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
  /** The scene the field starts with, e.g. when editing one. */
  initialItem?: { title: string };
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}

/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface SceneItemInputHandle {
  /** Whether the title differs from what the field started with. */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added a scene (false when the title is empty). */
  commit: () => boolean;
}

/**
 * Names a scene: a heading that groups the steps after it, up to the next
 * scene, in the editor and the queue.
 */
export const SceneItemInput = forwardRef<
  SceneItemInputHandle,
  SceneItemInputProps
>(function SceneItemInput(props, ref) {
  const { onAdd, initialItem, submitLabel } = props;
  const { t } = useI18n();
  const [title, setTitle] = useState(initialItem?.title ?? "");

  const handleAdd = (): boolean => {
    const trimmed = title.trim();
    if (!trimmed) {
      return false;
    }
    onAdd({ type: "scene", title: trimmed });
    setTitle("");
    return true;
  };

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => title.trim() !== (initialItem?.title ?? "").trim(),
      commit: handleAdd,
    }),
    [title, initialItem]
  );

  return (
    <div className="sb-playlist-add-row">
      <input
        className="sb-settings-text-input sb-playlist-input"
        type="text"
        value={title}
        dir="auto"
        placeholder={t("playlist-scene-placeholder", {
          defaultValue: "e.g. Scene 1 · Hagar",
        })}
        aria-label={t("playlist-scene-label", { defaultValue: "Scene title" })}
        onInput={(event: Event) => {
          setTitle((event.currentTarget as HTMLInputElement).value);
        }}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleAdd();
          }
        }}
      />
      <button
        type="button"
        className="sb-settings-save-button"
        onClick={handleAdd}
        disabled={!title.trim()}
      >
        {submitLabel ?? t("playlist-add-button", { defaultValue: "Add item" })}
      </button>
    </div>
  );
});
