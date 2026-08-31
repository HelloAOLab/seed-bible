import { useEffect } from "preact/hooks";
import { useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { Annotation } from "../../managers/AnnotationsManager";
import type { StoredHighlight } from "../../managers/HighlightsManager";
import type { Bookmark } from "../../managers/BookmarksManager";
import type { Playlist } from "../../managers/PlaylistManager";
import type { TodayPassageTarget } from "../../managers/TodayManager";
import {
  CONTENT_FILTERS,
  annotationPlainText,
  type ContentFilter,
} from "../../managers/YourContentManager";
import { AnnotationPreview } from "../DiscoverPane/DiscoverPane";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n";
import "./YourContentPane.css";

export const YOUR_CONTENT_PANE_ID = "your-content-pane";

/** How many items each section shows before "See all" opens the full list. */
const PREVIEW_LIMIT = 3;

export interface YourContentScreenProps {
  state: SeedBibleState;
  /** Opens a passage in the reader and leaves this screen. */
  onOpenPassage: (target: TodayPassageTarget) => void;
  /** Starts a playlist and leaves this screen. */
  onPlayPlaylist: (playlist: Playlist) => void;
  /** Opens an annotation in the editor and leaves this screen. */
  onEditAnnotation: (annotation: Annotation) => void;
}

/** Pane header title. A component so it can call `useI18n`. */
export function YourContentPaneTitle() {
  const { t } = useI18n();
  return <>{t("your-content", { defaultValue: "Your content" })}</>;
}

/* ----------------------------------------------------------------- helpers */

/** The verses an annotation targets, however it happens to record them. */
function annotationVerses(annotation: Annotation): number[] {
  if (annotation.verseNumbers?.length) {
    return annotation.verseNumbers;
  }
  const start = annotation.verseNumber;
  if (start == null) {
    return [];
  }
  const end = annotation.endVerseNumber;
  if (end == null || end <= start) {
    return [start];
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** "Genesis 1:1", "Genesis 1:1-3", or "Genesis 1" with no verses. */
function formatReference(
  bookNames: Map<string, string>,
  bookId: string,
  chapterNumber: number,
  verses: number[]
): string {
  const book = bookNames.get(bookId) ?? bookId;
  const base = `${book} ${chapterNumber}`;
  if (verses.length === 0) {
    return base;
  }
  const first = verses[0];
  const last = verses[verses.length - 1];
  // A contiguous run reads as a range; anything gappier just names its ends.
  return first === last ? `${base}:${first}` : `${base}:${first}-${last}`;
}

/**
 * Expands a stored verse target into its numbers. Highlights and bookmarks
 * record a target the same way — one verse, or an inclusive `[start, end]`.
 */
function verseNumbersOf(
  verse: number | readonly [number, number] | undefined
): number[] {
  if (verse == null) {
    return [];
  }
  if (typeof verse === "number") {
    return [verse];
  }
  const [start, end] = verse;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * "Nov 02, 2025", or "Nov 02" in `short` form.
 *
 * The short form is for the places the design puts a date inside a chip or a
 * tile, where the year would wrap the line. Undated content gets an empty
 * string rather than "Invalid Date".
 */
function formatDate(
  ms: number | null | undefined,
  language: string,
  form: "long" | "short" = "long"
): string {
  if (ms == null || !Number.isFinite(ms)) {
    return "";
  }
  return new Date(ms).toLocaleDateString(language, {
    month: "short",
    day: "2-digit",
    ...(form === "long" ? { year: "numeric" } : {}),
  });
}

/**
 * The text of a verse, fetched on demand.
 *
 * Nothing stores the wording of a highlighted or annotated verse, only its
 * reference — so the quoted line in each card is read back from the
 * translation. Returns an empty string until it arrives (and if it never
 * does), which the cards render as just the reference.
 */
function useVerseText(
  state: SeedBibleState,
  translationId: string | undefined,
  bookId: string,
  chapterNumber: number,
  verse: number | undefined
): string {
  const text = useSignal("");

  useEffect(() => {
    let cancelled = false;
    if (verse == null) {
      text.value = "";
      return;
    }
    const translation = translationId ?? state.today.getDefaultTranslation();
    if (!translation) {
      return;
    }
    void state.today
      .getVerseText(translation, bookId, chapterNumber, verse)
      .then((value) => {
        if (!cancelled) {
          text.value = value ?? "";
        }
      })
      .catch(() => {
        // A verse that won't load just shows as its reference.
      });
    return () => {
      cancelled = true;
    };
  }, [translationId, bookId, chapterNumber, verse]);

  return text.value;
}

/* ---------------------------------------------------------------- sections */

function SectionHeader(props: {
  title: string;
  /** Omitted when the section is already showing everything it has. */
  onSeeAll?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sb-content-section-head">
      <h3 className="sb-content-section-title">{props.title}</h3>
      {props.onSeeAll ? (
        <button
          type="button"
          className="sb-content-see-all"
          onClick={props.onSeeAll}
        >
          {t("see-all", { defaultValue: "See all" })}
        </button>
      ) : null}
    </div>
  );
}

function AnnotationCard(props: {
  state: SeedBibleState;
  annotation: Annotation;
  onOpenPassage: (target: TodayPassageTarget) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { state, annotation } = props;
  const { t, language } = useI18n();
  const bookNames = state.today.bookNames.value;
  const verses = annotationVerses(annotation);
  const verseText = useVerseText(
    state,
    undefined,
    annotation.bookId,
    annotation.chapterNumber,
    verses[0]
  );

  const open = () =>
    props.onOpenPassage({
      bookId: annotation.bookId,
      chapter: annotation.chapterNumber,
      verse: verses[0],
    });

  return (
    <div className="sb-content-annotation">
      <div className="sb-content-annotation-head">
        <span className="sb-content-date">
          {formatDate(annotation.data.createdAtMs, language)}
        </span>
        <ContextMenuWithButton
          icon="more_horiz"
          buttonClassName="sb-content-kebab"
          aria-label={t("more-options", { defaultValue: "More options" })}
        >
          <ContextMenuItem onClick={props.onEdit}>
            <MaterialIcon>edit</MaterialIcon>
            {t("edit", { defaultValue: "Edit" })}
          </ContextMenuItem>
          <ContextMenuItem
            className="sb-content-menu-delete"
            onClick={props.onDelete}
          >
            <MaterialIcon>delete</MaterialIcon>
            {t("delete", { defaultValue: "Delete" })}
          </ContextMenuItem>
        </ContextMenuWithButton>
      </div>

      <button type="button" className="sb-content-quote" onClick={open}>
        {verseText ? (
          <span className="sb-content-quote-text">{verseText}</span>
        ) : null}
        <span className="sb-content-quote-ref">
          {formatReference(
            bookNames,
            annotation.bookId,
            annotation.chapterNumber,
            verses
          )}
        </span>
      </button>

      <div className="sb-content-annotation-body">
        <AnnotationPreview html={annotation.data.html} />
      </div>
    </div>
  );
}

function HighlightRow(props: {
  state: SeedBibleState;
  stored: StoredHighlight;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { state, stored } = props;
  const bookNames = state.today.bookNames.value;
  const verses = verseNumbersOf(stored.highlight.verse);
  const verseText = useVerseText(
    state,
    stored.translationId,
    stored.bookId,
    stored.chapterNumber,
    verses[0]
  );

  // Same variable the reader paints highlights with, so a custom colour and a
  // theme's palette both come out right here.
  const color =
    stored.highlight.customColor ??
    `var(--sb-highlight-${stored.highlight.colorId}-color, var(--sb-primary-color))`;

  return (
    <button
      type="button"
      className="sb-content-highlight"
      style={{ borderInlineStartColor: color }}
      onClick={() =>
        props.onOpenPassage({
          bookId: stored.bookId,
          chapter: stored.chapterNumber,
          verse: verses[0],
          translationId: stored.translationId,
        })
      }
    >
      {verseText ? (
        <span className="sb-content-highlight-text">{verseText}</span>
      ) : null}
      <span className="sb-content-highlight-ref">
        {formatReference(
          bookNames,
          stored.bookId,
          stored.chapterNumber,
          verses
        )}
      </span>
    </button>
  );
}

function BookmarkPill(props: {
  state: SeedBibleState;
  bookmark: Bookmark;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { state, bookmark } = props;
  const { t, language } = useI18n();
  const bookNames = state.today.bookNames.value;
  const verse = verseNumbersOf(bookmark.verse)[0];
  const book = bookNames.get(bookmark.bookId) ?? bookmark.bookId;

  return (
    <button
      type="button"
      className="sb-content-bookmark"
      onClick={() =>
        props.onOpenPassage({
          bookId: bookmark.bookId,
          chapter: bookmark.chapterNumber,
          verse,
          translationId: bookmark.translationId,
        })
      }
    >
      <span className="sb-content-bookmark-name">
        {`${book} ${bookmark.chapterNumber}${verse ? `:${verse}` : ""}`}
      </span>
      <span
        className={`sb-content-bookmark-kind${
          verse ? " sb-content-bookmark-kind-verse" : ""
        }`}
      >
        {verse
          ? t("verse", { defaultValue: "Verse" })
          : t("chapter", { defaultValue: "Chapter" })}
      </span>
      <span className="sb-content-bookmark-date">
        {formatDate(bookmark.createdAt, language, "short")}
      </span>
    </button>
  );
}

function PlaylistTile(props: {
  playlist: Playlist;
  onPlay: (playlist: Playlist) => void;
}) {
  const { playlist } = props;
  const { t, language } = useI18n();

  return (
    <button
      type="button"
      className="sb-content-playlist"
      onClick={() => props.onPlay(playlist)}
    >
      <span className="sb-content-playlist-play" aria-hidden="true">
        <MaterialIcon>play_arrow</MaterialIcon>
      </span>
      <span className="sb-content-playlist-title">
        {playlist.title ??
          t("untitled-playlist", { defaultValue: "Untitled playlist" })}
      </span>
      <span className="sb-content-playlist-meta">
        {t("playlist-item-count", {
          defaultValue: "{{count}} items",
          count: playlist.items.length,
        })}
        {" · "}
        {formatDate(playlist.updatedAtMs, language, "short")}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ screen */

/**
 * The "Your content" screen (issue #1553): everything the reader has made —
 * annotations, highlights, bookmarks and playlists — in one place, filtered
 * by a search box and a row of chips.
 *
 * "All" shows the first few of each section with a "See all" that switches
 * the chips to that one section in full.
 */
export function YourContentPane(props: YourContentScreenProps) {
  const { state, onOpenPassage } = props;
  const { yourContent, bookmarks, playlists, annotations } = state;
  const { t } = useI18n();

  useEffect(() => {
    void yourContent.load();
  }, []);

  const filter = yourContent.filter.value;
  const status = yourContent.status.value;
  const rawQuery = yourContent.query.value;

  const needle = useComputed(() =>
    yourContent.query.value.trim().toLowerCase()
  ).value;

  const matches = (...fields: (string | null | undefined)[]) =>
    needle.length === 0 ||
    fields.some((field) => field?.toLowerCase().includes(needle));

  const bookNames = state.today.bookNames.value;
  const bookName = (bookId: string) => bookNames.get(bookId) ?? bookId;

  const visibleAnnotations = yourContent.annotations.value.filter((a) =>
    matches(annotationPlainText(a), bookName(a.bookId))
  );
  const visibleHighlights = yourContent.highlights.value.filter((h) =>
    matches(bookName(h.bookId))
  );
  const visibleBookmarks = bookmarks.bookmarks.value.filter((b) =>
    matches(bookName(b.bookId))
  );
  const visiblePlaylists = playlists.userPlaylists.value.filter((p) =>
    matches(p.title, p.description)
  );

  const showing = (section: ContentFilter) =>
    filter === "all" || filter === section;
  /** In "all" each section is a preview; a chosen section shows everything. */
  const limit = (items: unknown[]) =>
    filter === "all" ? Math.min(items.length, PREVIEW_LIMIT) : items.length;
  const seeAll = (section: ContentFilter, items: unknown[]) =>
    filter === "all" && items.length > PREVIEW_LIMIT
      ? () => {
          yourContent.filter.value = section;
        }
      : undefined;

  const chipLabel = (value: ContentFilter): string => {
    switch (value) {
      case "all":
        return t("all", { defaultValue: "All" });
      case "annotations":
        return t("annotations", { defaultValue: "Annotations" });
      case "highlights":
        return t("highlights", { defaultValue: "Highlights" });
      case "bookmarks":
        return t("bookmarks", { defaultValue: "Bookmarks" });
      case "playlists":
        return t("playlists", { defaultValue: "Playlists" });
    }
  };

  const sectionCounts: Record<Exclude<ContentFilter, "all">, number> = {
    annotations: visibleAnnotations.length,
    highlights: visibleHighlights.length,
    bookmarks: visibleBookmarks.length,
    playlists: visiblePlaylists.length,
  };

  /**
   * Nothing to show *for the chip that's selected*. Counting every section
   * instead would leave a chosen-but-empty section as a blank screen, because
   * the sections it isn't showing still had content.
   */
  const nothingToShow =
    status === "ready" &&
    (filter === "all"
      ? Object.values(sectionCounts).every((count) => count === 0)
      : sectionCounts[filter] === 0);

  const emptyMessage = (): string => {
    if (needle.length > 0) {
      return t("your-content-no-matches", {
        defaultValue: "Nothing matches that search.",
      });
    }
    switch (filter) {
      case "annotations":
        return t("your-content-empty-annotations", {
          defaultValue: "Notes you write will show up here.",
        });
      case "highlights":
        return t("your-content-empty-highlights", {
          defaultValue: "Verses you highlight will show up here.",
        });
      case "bookmarks":
        return t("your-content-empty-bookmarks", {
          defaultValue: "Passages you bookmark will show up here.",
        });
      case "playlists":
        return t("your-content-empty-playlists", {
          defaultValue: "Playlists you create will show up here.",
        });
      case "all":
        return t("your-content-empty", {
          defaultValue:
            "Notes, highlights, bookmarks and playlists you make will show up here.",
        });
    }
  };

  return (
    <div className="sb-content-screen">
      <div className="sb-content-inner">
        <div className="sb-content-search">
          <MaterialIcon aria-hidden="true">search</MaterialIcon>
          <input
            type="search"
            value={rawQuery}
            placeholder={t("search-placeholder", { defaultValue: "Search..." })}
            aria-label={t("search-your-content", {
              defaultValue: "Search your content",
            })}
            onInput={(event) => {
              yourContent.query.value = (
                event.currentTarget as HTMLInputElement
              ).value;
            }}
          />
        </div>

        <div className="sb-content-chips" role="tablist">
          {CONTENT_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={`sb-content-chip${
                filter === value ? " sb-content-chip-active" : ""
              }`}
              onClick={() => {
                yourContent.filter.value = value;
              }}
            >
              {chipLabel(value)}
            </button>
          ))}
        </div>

        {status === "loading" ? (
          <p className="sb-content-status">
            {t("loading-your-content", {
              defaultValue: "Gathering your content…",
            })}
          </p>
        ) : null}

        {status === "error" ? (
          <div className="sb-content-status">
            <p>
              {t("your-content-load-failed", {
                defaultValue: "Your content couldn't be loaded.",
              })}
            </p>
            <button
              type="button"
              className="sb-content-retry"
              onClick={() => void yourContent.load({ force: true })}
            >
              {t("try-again", { defaultValue: "Try again" })}
            </button>
          </div>
        ) : null}

        {nothingToShow ? (
          <p className="sb-content-status">{emptyMessage()}</p>
        ) : null}

        {showing("annotations") && visibleAnnotations.length > 0 ? (
          <section className="sb-content-section">
            <SectionHeader
              title={t("annotations", { defaultValue: "Annotations" })}
              onSeeAll={seeAll("annotations", visibleAnnotations)}
            />
            <div className="sb-content-annotations">
              {visibleAnnotations
                .slice(0, limit(visibleAnnotations))
                .map((annotation) => (
                  <AnnotationCard
                    key={annotation.id}
                    state={state}
                    annotation={annotation}
                    onOpenPassage={onOpenPassage}
                    onEdit={() => props.onEditAnnotation(annotation)}
                    onDelete={() => {
                      // Drop it from the list straight away — waiting on the
                      // server would leave a deleted note on screen. If the
                      // delete then fails, put it back rather than showing a
                      // note as gone that is still there.
                      yourContent.removeAnnotation(annotation.id);
                      void annotations
                        .deleteAnnotationAndRefresh(annotation)
                        .catch((error) => {
                          console.error("Error deleting annotation:", error);
                          yourContent.restoreAnnotation(annotation);
                        });
                    }}
                  />
                ))}
            </div>
          </section>
        ) : null}

        {showing("highlights") && visibleHighlights.length > 0 ? (
          <section className="sb-content-section">
            <SectionHeader
              title={t("highlights", { defaultValue: "Highlights" })}
              onSeeAll={seeAll("highlights", visibleHighlights)}
            />
            <div className="sb-content-highlights">
              {visibleHighlights
                .slice(0, limit(visibleHighlights))
                .map((stored, index) => (
                  <HighlightRow
                    key={`${stored.translationId}/${stored.bookId}/${stored.chapterNumber}/${index}`}
                    state={state}
                    stored={stored}
                    onOpenPassage={onOpenPassage}
                  />
                ))}
            </div>
          </section>
        ) : null}

        {showing("bookmarks") && visibleBookmarks.length > 0 ? (
          <section className="sb-content-section">
            <SectionHeader
              title={t("bookmarks", { defaultValue: "Bookmarks" })}
              onSeeAll={seeAll("bookmarks", visibleBookmarks)}
            />
            <div className="sb-content-bookmarks">
              {visibleBookmarks.slice(0, limit(visibleBookmarks)).map((b) => (
                <BookmarkPill
                  key={b.id}
                  state={state}
                  bookmark={b}
                  onOpenPassage={onOpenPassage}
                />
              ))}
            </div>
          </section>
        ) : null}

        {showing("playlists") && visiblePlaylists.length > 0 ? (
          <section className="sb-content-section">
            <SectionHeader
              title={t("playlists", { defaultValue: "Playlists" })}
              onSeeAll={seeAll("playlists", visiblePlaylists)}
            />
            <div className="sb-content-playlists">
              {visiblePlaylists.slice(0, limit(visiblePlaylists)).map((p) => (
                <PlaylistTile
                  key={p.id}
                  playlist={p}
                  onPlay={props.onPlayPlaylist}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
