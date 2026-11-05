import { useI18n } from "../../i18n/I18nManager";
import type {
  PlaylistItemData,
  PlaylistManager,
} from "../../managers/PlaylistManager";
import { playlistStepMinutes } from "./playlistSteps";

export type PeIconName =
  | "arrow-right"
  | "audio"
  | "book-open"
  | "chevron-down"
  | "close"
  | "copy"
  | "drag-handle"
  | "eye"
  | "info"
  | "items-list"
  | "link"
  | "note"
  | "pencil"
  | "play"
  | "scripture"
  | "settings"
  | "trash"
  | "video";

/** One of the design's icons, drawn in the surrounding text color. */
export function PeIcon(props: { name: PeIconName; className?: string }) {
  return (
    <span
      className={`sb-pe-icon sb-pe-icon--${props.name}${
        props.className ? ` ${props.className}` : ""
      }`}
      aria-hidden="true"
    />
  );
}

/** A labelled on/off switch. */
export function PeSwitch(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      className="sb-pe-switch"
      onClick={() => props.onChange(!props.checked)}
    >
      <span className="sb-pe-switch-track" />
      <span>{props.label}</span>
    </button>
  );
}

/**
 * The settings every step has — reading time, pausing for the group, and
 * leader-only — for the open step. The desktop toolbar shows them in a row;
 * the phone tucks them into a "Step Settings" section under the step.
 */
export function StepSettings(props: {
  playlists: PlaylistManager;
  index: number;
  item: PlaylistItemData;
}) {
  const { playlists, index, item } = props;
  const { t } = useI18n();
  const minutes = playlistStepMinutes(item);
  const update = (changes: Partial<PlaylistItemData>) =>
    playlists.updateEditingPlaylistItem(index, {
      ...item,
      ...changes,
    } as PlaylistItemData);

  return (
    <>
      <div className="sb-pe-reading-time">
        <span id={`sb-pe-reading-time-${index}`}>
          {t("playlist-editor-reading-time", { defaultValue: "Reading time" })}
        </span>
        <div
          className="sb-pe-stepper"
          role="group"
          aria-labelledby={`sb-pe-reading-time-${index}`}
        >
          <button
            type="button"
            className="sb-pe-stepper-button"
            aria-label={t("playlist-editor-less-time", {
              defaultValue: "Less time",
            })}
            disabled={minutes <= 1}
            onClick={() => update({ minutes: Math.max(1, minutes - 1) })}
          >
            −
          </button>
          <span aria-live="polite">
            {t("playlist-editor-minutes", {
              minutes,
              defaultValue: "{{minutes}} min",
            })}
          </span>
          <button
            type="button"
            className="sb-pe-stepper-button"
            aria-label={t("playlist-editor-more-time", {
              defaultValue: "More time",
            })}
            disabled={minutes >= 999}
            onClick={() => update({ minutes: minutes + 1 })}
          >
            +
          </button>
        </div>
      </div>
      <PeSwitch
        label={t("playlist-editor-pause-for-group", {
          defaultValue: "Pause for group",
        })}
        checked={!!item.pauseForGroup}
        onChange={(checked) =>
          update({ pauseForGroup: checked ? true : undefined })
        }
      />
      <PeSwitch
        label={t("playlist-editor-leader-only", {
          defaultValue: "Leader only",
        })}
        checked={!!item.leaderOnly}
        onChange={(checked) =>
          update({ leaderOnly: checked ? true : undefined })
        }
      />
    </>
  );
}
