import "../Discover/DiscoverPane.css";
import "./PlaylistOverview.css";
import type { ComponentChild, ComponentChildren } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import { HeroImageBanner } from "../HeroImageField/HeroImageField";
import { MaterialIcon, SeedBibleIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";
import { PlaylistItemNoteTag } from "../PlaylistItemNoteTag/PlaylistItemNoteTag";
import {
  playlistStepKind,
  playlistStepMinutes,
  playlistTotalMinutes,
  type PlaylistStepKind,
} from "../PlaylistEditor/playlistSteps";

/**
 * A playlist's cover, author, description and steps, with a back button and
 * title above and an optional button pinned below. Both the page a playlist's
 * link opens on and the list of steps of a playing playlist are this, so the
 * two look the same; each supplies its own rows (`children`, as `<li>`s).
 */
export function PlaylistOverview(props: {
  title: string;
  backLabel: string;
  onBack: () => void;
  /** Shown after the title, e.g. a spinner while playback opens. */
  titleAccessory?: ComponentChild;
  /** Buttons at the header's end, e.g. Share and a menu. */
  headerActions?: ComponentChild;
  heroImageUrl: string | null;
  authorName: string | null;
  description: string | null;
  /** The steps, for the count and time estimate. */
  items: readonly PlaylistItemData[];
  /** The button pinned below the steps, if any. */
  action?: { label: string; onClick: () => void; disabled?: boolean } | null;
  className?: string;
  children: ComponentChildren;
}) {
  const { title, items, action, description } = props;
  const { t, isRtl } = useI18n();
  const count = t("playlist-page-item-count", {
    count: items.length,
    defaultValue: "{{count}} items",
  });
  const summary =
    items.length > 0
      ? `${count} · ${t("playlist-page-total-minutes", {
          minutes: playlistTotalMinutes(items),
          defaultValue: "~{{minutes}} min",
        })}`
      : count;

  return (
    <div className={`sb-playlist-page ${props.className ?? ""}`}>
      <div className="sb-playlist-page-header">
        <button
          type="button"
          className="sb-playlist-page-back"
          aria-label={props.backLabel}
          title={props.backLabel}
          onClick={props.onBack}
        >
          <MaterialIcon>{isRtl ? "arrow_forward" : "arrow_back"}</MaterialIcon>
        </button>
        <h1 className="sb-playlist-page-title">
          <span dir="auto">{title}</span>
        </h1>
        {props.titleAccessory}
        {props.headerActions ? (
          <div className="sb-playlist-page-header-actions">
            {props.headerActions}
          </div>
        ) : null}
      </div>
      <div className="sb-playlist-page-body">
        {props.heroImageUrl ? (
          <HeroImageBanner url={props.heroImageUrl} alt={title} />
        ) : null}
        <div className="sb-playlist-page-about">
          {props.authorName ? (
            <p className="sb-playlist-page-author">
              {t("shared-page-by-author", {
                author: props.authorName,
                defaultValue: "By {{author}}",
              })}
            </p>
          ) : null}
          {description ? (
            <p className="sb-playlist-page-description" dir="auto">
              {description}
            </p>
          ) : null}
          <p className="sb-playlist-page-count">{summary}</p>
        </div>
        <ol className="sb-discover-list sb-playlist-page-items">
          {props.children}
        </ol>
      </div>
      {action ? (
        <div className="sb-playlist-page-footer">
          <button
            type="button"
            className="sb-playlist-page-start"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** The icon for each kind of step other than scripture, which has the app's. */
const STEP_ICON: Record<
  Exclude<PlaylistStepKind, "scripture" | "compare">,
  string
> = {
  video: "videocam",
  audio: "headphones",
  link: "link",
  note: "description",
  question: "help",
};

/**
 * A step's icon in a list of steps: the app's own for scripture and compare
 * steps, and one for each other kind (a video and a plain link told apart).
 */
export function PlaylistStepIcon(props: { item: PlaylistItemData }) {
  const kind = playlistStepKind(props.item);
  if (kind === "scripture" || kind === "compare") {
    return (
      <SeedBibleIcon
        size={20}
        className="sb-discover-item-icon sb-playlist-step-icon-scripture"
        role={undefined}
        aria-label={undefined}
        aria-hidden="true"
      />
    );
  }
  return (
    <MaterialIcon className="sb-discover-item-icon">
      {STEP_ICON[kind]}
    </MaterialIcon>
  );
}

/**
 * What a row of steps shows for one: its icon, name (with any note's title),
 * and its time estimate at the row's end.
 */
export function PlaylistOverviewItemContent(props: {
  item: PlaylistItemData;
  resolveBookName: (bookId: string) => string;
  /** In place of the step's usual name, as the editor names a draft's. */
  label?: string;
}) {
  const { item } = props;
  const { t } = useI18n();
  return (
    <>
      <PlaylistStepIcon item={item} />
      <span className="sb-discover-item-title" dir="auto">
        {props.label ?? playlistItemLabel(item, t, props.resolveBookName)}
        <PlaylistItemNoteTag item={item} />
      </span>
      <span className="sb-playlist-page-item-minutes">
        {t("playlist-editor-minutes", {
          minutes: playlistStepMinutes(item),
          defaultValue: "{{minutes}} min",
        })}
      </span>
    </>
  );
}

/**
 * One step in a list of steps, as the playing list, a playlist's page and
 * the editor all show them: a drag handle when it can be moved, the step's
 * {@link PlaylistOverviewItemContent} (a button when it opens the step), and
 * anything else at its end, such as the editor's Duplicate and Delete.
 */
export function PlaylistStepRow(props: {
  item: PlaylistItemData;
  resolveBookName: (bookId: string) => string;
  label?: string;
  /** Highlighted as the step that's playing, or open in the editor. */
  current?: boolean;
  ariaCurrent?: boolean | "step";
  onOpen?: () => void;
  /** Pointer handlers for dragging it, from `useDragReorder`. */
  dragHandleProps?: Record<string, unknown>;
  dragLabel?: string;
  className?: string;
  openClassName?: string;
  handleClassName?: string;
  trailing?: ComponentChildren;
}) {
  const { item, resolveBookName, current } = props;
  const content = (
    <PlaylistOverviewItemContent
      item={item}
      resolveBookName={resolveBookName}
      label={props.label}
    />
  );
  return (
    <li
      className={`sb-discover-item sb-discover-item--row sb-playlist-page-item${
        current ? " sb-playlist-step-row--current" : ""
      }${props.className ? ` ${props.className}` : ""}`}
      dir="auto"
    >
      {props.dragHandleProps ? (
        <button
          type="button"
          className={`sb-discover-item-drag-handle${
            props.handleClassName ? ` ${props.handleClassName}` : ""
          }`}
          aria-label={props.dragLabel}
          {...props.dragHandleProps}
        >
          <MaterialIcon>drag_indicator</MaterialIcon>
        </button>
      ) : null}
      {props.onOpen ? (
        <button
          type="button"
          className={`sb-playlist-step-row-button${
            props.openClassName ? ` ${props.openClassName}` : ""
          }`}
          aria-current={props.ariaCurrent}
          onClick={props.onOpen}
        >
          {content}
        </button>
      ) : (
        content
      )}
      {props.trailing}
    </li>
  );
}
