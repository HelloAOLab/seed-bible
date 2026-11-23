import { useId, useImperativeHandle, useState } from "preact/hooks";
import { forwardRef } from "preact/compat";
import { useI18n } from "../i18n/I18nManager";
import type { PlaylistItemData } from "../managers/PlaylistManager";
import { Button } from "./Button/Button";
import { Checkbox } from "./Checkbox/Checkbox";
import { TextInput } from "./TextField/TextField";

interface LinkItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
  /** URL, title, and embed flag the fields start with, e.g. when editing an item. */
  initialItem?: { url: string; title?: string; embed?: boolean };
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}

/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface LinkItemInputHandle {
  /** Whether the user has typed a URL or title that hasn't been added yet. */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added an item (false if empty or the URL didn't validate). */
  commit: () => boolean;
}

/**
 * Adds a URL (link item) to the playlist. Tracks the in-progress URL text and
 * any validation error.
 */
export const LinkItemInput = forwardRef<
  LinkItemInputHandle,
  LinkItemInputProps
>(function LinkItemInput(props, ref) {
  const { onAdd, initialItem, submitLabel } = props;
  const { t } = useI18n();
  const [value, setValue] = useState(initialItem?.url ?? "");
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [embed, setEmbed] = useState(initialItem?.embed ?? false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  /** Submits the current input. Returns whether it actually added an item. */
  const handleAdd = (): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    let url: string;
    try {
      url = new URL(trimmed).toString();
    } catch {
      setError(
        t("playlist-add-link-error", { defaultValue: "Enter a valid URL" })
      );
      return false;
    }
    const trimmedTitle = title.trim();
    onAdd({
      type: "link",
      url,
      title: trimmedTitle || undefined,
      embed: embed || undefined,
    });
    setValue("");
    setTitle("");
    setEmbed(false);
    setError(null);
    return true;
  };

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () =>
        value.trim() !== (initialItem?.url ?? "").trim() ||
        title.trim() !== (initialItem?.title ?? "").trim() ||
        (!!initialItem && embed !== (initialItem.embed ?? false)),
      commit: handleAdd,
    }),
    [value, title, embed]
  );

  return (
    <>
      <TextInput
        className="sb-playlist-input sb-playlist-add-title-input"
        value={title}
        dir="auto"
        aria-label={t("playlist-item-title-placeholder", {
          defaultValue: "Title (optional)",
        })}
        placeholder={t("playlist-item-title-placeholder", {
          defaultValue: "Title (optional)",
        })}
        onValueInput={setTitle}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleAdd();
          }
        }}
      />
      <div className="sb-playlist-add-row sb-playlist-add-link-row">
        <TextInput
          className="sb-playlist-input"
          type="url"
          value={value}
          dir="auto"
          aria-label={t("playlist-add-link-label", { defaultValue: "Link" })}
          placeholder={t("playlist-add-link-placeholder", {
            defaultValue: "https://example.com",
          })}
          invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onValueInput={(next) => {
            setValue(next);
            setError(null);
          }}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
        />
      </div>
      <div className="sb-playlist-add-row sb-playlist-add-link-controls">
        <Checkbox
          className="sb-playlist-embed-toggle"
          label={t("playlist-add-link-embed", {
            defaultValue: "Embed this link",
          })}
          checked={embed}
          onToggled={setEmbed}
        />
        <Button
          variant="primary"
          className="sb-settings-save-button"
          onClick={handleAdd}
          disabled={!value.trim()}
        >
          {submitLabel ??
            t("playlist-add-button", { defaultValue: "Add item" })}
        </Button>
      </div>
      {error ? (
        <div id={errorId} className="sb-playlist-add-error" role="alert">
          {error}
        </div>
      ) : null}
    </>
  );
});
