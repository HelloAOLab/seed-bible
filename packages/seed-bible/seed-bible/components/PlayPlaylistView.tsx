import { useEffect, useRef } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { TabsManager } from "../managers/TabsManager";
import type { PlaylistManager } from "../managers/PlaylistManager";
import { setSafeHtml } from "../managers/Sanitization";
import { resolveLinkMedia } from "../managers/resolveLinkMedia";
import { MaterialIcon } from "./icons";
import { DiscoverSection } from "./DiscoverSection";
import { playlistItemLabel } from "./playlistItemLabel";

interface PlayPlaylistViewProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
}

/**
 * Playback screen shown inside the discover pane while a playlist is playing.
 * Displays the playlist title, the queue of items, and a bottom-anchored bar
 * with the current item and previous/next controls.
 */
export function PlayPlaylistView(props: PlayPlaylistViewProps) {
  const { playlists, tabs } = props;
  const { t } = useI18n();

  // Reading `.value` during render subscribes the component to updates.
  const playing = playlists.playing.value;
  if (!playing) {
    return null;
  }

  const queue = playing.queue.value;
  const currentIndex = playing.currentIndex.value;
  const currentItem = playing.currentItem.value;
  const sourcePlaylists = playing.playlists.value;

  // Resolve verse book IDs to full book names using the selected tab's loaded
  // translation, when available. Falls back to the raw book ID otherwise.
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const title =
    sourcePlaylists[0]?.title ??
    t("untitled-playlist", { defaultValue: "Untitled playlist" });

  return (
    <div className="sb-discover-pane sb-play-playlist">
      <div className="sb-discover-header">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => playlists.stopPlaying()}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <h2 className="sb-discover-title" dir="auto">
          {title}
        </h2>
      </div>

      <div className="sb-play-playlist-body">
        <DiscoverSection title={t("queue", { defaultValue: "Queue" })}>
          <ul className="sb-discover-list">
            {queue.map((item, index) => (
              <li
                key={index}
                className={
                  "sb-discover-item sb-discover-item--row sb-play-playlist-item" +
                  (index === currentIndex
                    ? " sb-play-playlist-item--current"
                    : "")
                }
                dir="auto"
              >
                <button
                  type="button"
                  className="sb-play-playlist-item-button"
                  aria-current={index === currentIndex}
                  onClick={() => playing.jumpTo(index)}
                >
                  <span className="sb-discover-item-title">
                    {playlistItemLabel(item, t, resolveBookName)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DiscoverSection>
      </div>

      {currentItem && currentItem.type !== "bible-verse" ? (
        <div className="sb-play-playlist-content">
          <DiscoverSection
            title={
              currentItem.title?.trim() ||
              t("content", { defaultValue: "Content" })
            }
          >
            {currentItem.type === "html" ? (
              <PlaylistHtmlContent html={currentItem.html} />
            ) : (
              <PlaylistLinkContent
                url={currentItem.url}
                title={currentItem.title}
                embed={currentItem.embed}
              />
            )}
          </DiscoverSection>
        </div>
      ) : null}

      <div className="sb-play-controls">
        <span className="sb-play-controls-label" dir="auto">
          {currentItem
            ? playlistItemLabel(currentItem, t, resolveBookName)
            : t("now-playing", { defaultValue: "Now playing" })}
        </span>
        <div className="sb-play-controls-buttons">
          <button
            type="button"
            className="sb-play-controls-button"
            aria-label={t("previous", { defaultValue: "Previous" })}
            disabled={!playing.hasPrevious.value}
            onClick={() => playing.previous()}
          >
            <MaterialIcon>skip_previous</MaterialIcon>
          </button>
          <button
            type="button"
            className="sb-play-controls-button"
            aria-label={t("next", { defaultValue: "Next" })}
            disabled={!playing.hasNext.value}
            onClick={() => playing.next()}
          >
            <MaterialIcon>skip_next</MaterialIcon>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a playlist HTML snippet. The stored value was sanitized when the item
 * was created, but playlists are publicly readable and may come from untrusted
 * authors, so the HTML is sanitized again on render via {@link setSafeHtml}.
 */
function PlaylistHtmlContent(props: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      void setSafeHtml(props.html, el);
    }
  }, [props.html]);
  return <div ref={ref} className="sb-play-playlist-content-html" dir="auto" />;
}

/**
 * Renders a playlist link item based on what its URL points at (see
 * {@link resolveLinkMedia}): a direct video file plays in a `<video>` element,
 * a known video site (YouTube, Vimeo) embeds in an `<iframe>`, and anything
 * else shows the URL with a prominent "Open" button that opens a new tab.
 *
 * When the author checked "embed", any URL that isn't already a video or a
 * known video site is shown in an `<iframe>` instead of an "Open" link. Video
 * detection still takes precedence, so ticking embed never changes how a
 * recognized video renders.
 */
function PlaylistLinkContent(props: {
  url: string;
  title?: string;
  embed?: boolean;
}) {
  const { t } = useI18n();
  const media = resolveLinkMedia(props.url);

  if (media.kind === "video") {
    return (
      <video
        className="sb-play-playlist-content-video"
        src={media.url}
        controls
        playsInline
      />
    );
  }

  if (media.kind === "embed" || (media.kind === "link" && props.embed)) {
    return (
      <iframe
        className="sb-play-playlist-content-iframe"
        src={media.url}
        allow="autoplay; encrypted-media; web-share; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        title={props.title?.trim() || props.url}
      />
    );
  }

  return (
    <div className="sb-play-playlist-content-link-wrapper">
      <a
        className="sb-play-playlist-content-link"
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
        dir="auto"
      >
        {props.url}
      </a>
      <a
        className="sb-settings-save-button sb-play-playlist-open-button"
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("open-link", { defaultValue: "Open" })}
      </a>
    </div>
  );
}
