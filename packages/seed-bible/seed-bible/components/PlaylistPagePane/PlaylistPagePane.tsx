import { useI18n } from "../../i18n/I18nManager";
import type { Playlist } from "../../managers/PlaylistManager";
import {
  PlaylistOverview,
  PlaylistOverviewItemContent,
} from "../PlaylistOverview/PlaylistOverview";

/**
 * What a playlist's link (or its play button) opens on, filling the screen:
 * the playlist's overview, with a Start Reading button that starts it.
 */
export function PlaylistPagePane(props: {
  playlist: Playlist;
  authorName: string | null;
  /** A book's name in the reader's translation, for the scripture items. */
  resolveBookName: (bookId: string) => string;
  onStart: () => void;
  onBack: () => void;
}) {
  const { playlist, resolveBookName } = props;
  const { t } = useI18n();

  return (
    <PlaylistOverview
      title={
        playlist.title ??
        t("untitled-playlist", { defaultValue: "Untitled playlist" })
      }
      backLabel={t("back", { defaultValue: "Back" })}
      onBack={props.onBack}
      heroImageUrl={playlist.heroImageUrl ?? null}
      authorName={props.authorName}
      description={playlist.description?.trim() || null}
      items={playlist.items}
      action={{
        label: t("start-reading", { defaultValue: "Start Reading" }),
        onClick: props.onStart,
        disabled: playlist.items.length === 0,
      }}
    >
      {playlist.items.map((item, index) => (
        <li
          key={index}
          className="sb-discover-item sb-discover-item--row sb-playlist-page-item"
        >
          <PlaylistOverviewItemContent
            item={item}
            resolveBookName={resolveBookName}
          />
        </li>
      ))}
    </PlaylistOverview>
  );
}
