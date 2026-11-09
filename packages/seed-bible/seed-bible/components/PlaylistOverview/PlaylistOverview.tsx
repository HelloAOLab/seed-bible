import "../Discover/DiscoverPane.css";
import "./PlaylistOverview.css";
import type { ComponentChild, ComponentChildren } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import { HeroImageBanner } from "../HeroImageField/HeroImageField";
import { MaterialIcon } from "../icons";
import { playlistItemIcon } from "../playlistItemIcon";
import { playlistItemLabel } from "../playlistItemLabel";
import { PlaylistItemNoteTag } from "../PlaylistItemNoteTag/PlaylistItemNoteTag";
import { playlistTotalMinutes } from "../PlaylistEditor/playlistSteps";

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

/**
 * What a row of {@link PlaylistOverview} shows for a step: its icon, name,
 * note tag, and the author's time estimate when they gave one.
 */
export function PlaylistOverviewItemContent(props: {
  item: PlaylistItemData;
  resolveBookName: (bookId: string) => string;
}) {
  const { item } = props;
  const { t } = useI18n();
  return (
    <>
      <MaterialIcon className="sb-discover-item-icon">
        {playlistItemIcon(item)}
      </MaterialIcon>
      <span className="sb-discover-item-title" dir="auto">
        {playlistItemLabel(item, t, props.resolveBookName)}
        <PlaylistItemNoteTag item={item} />
      </span>
      {item.minutes != null ? (
        <span className="sb-playlist-page-item-minutes">
          {t("playlist-editor-minutes", {
            minutes: item.minutes,
            defaultValue: "{{minutes}} min",
          })}
        </span>
      ) : null}
    </>
  );
}
