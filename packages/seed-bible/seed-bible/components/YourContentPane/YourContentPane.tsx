import { useEffect } from "preact/hooks";
import { useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { Annotation } from "../../managers/AnnotationsManager";
import { annotationVerseNumbers } from "../../managers/AnnotationsManager";
import type { StoredHighlight } from "../../managers/HighlightsManager";
import type { Save } from "../../managers/SavesManager";
import type { Playlist } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { TodayPassageTarget } from "../../managers/TodayManager";
import {
  formatReadingPlanId,
  getReadingCalendar,
  latestReadingPlanProgress,
  summarizeCalendar,
  type ReadingPlanMetadata,
  type ReadingPlansManager,
} from "../../managers/ReadingPlansManager";
import { FEATURE_KEY_READING_PLANS } from "../../managers/FeaturesManager";
import {
  CONTENT_FILTERS,
  annotationPlainText,
  highlightKey,
  type ContentFilter,
} from "../../managers/YourContentManager";
import { AnnotationPreview } from "../DiscoverPane/AnnotationsSection";
import { PlaylistRow } from "../DiscoverPane/PlaylistRow";
import { HeroImageThumb } from "../HeroImageField/HeroImageField";
import { openSaveModalForLocation } from "../Tabs/Tabs";
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
  /** Opens a playlist in the editor and leaves this screen. */
  onEditPlaylist: (playlist: Playlist) => void;
  /** Opens an annotation in the editor and leaves this screen. */
  onEditAnnotation: (annotation: Annotation) => void;
  /**
   * Opens a reading plan in the plans pane and leaves this screen. A draft
   * has nothing to read yet, so the caller is expected to open it where the
   * author left off — the editor — rather than the detail view.
   */
  onOpenReadingPlan: (plan: ReadingPlanMetadata) => void;
  /** Opens a reading plan in the plan editor and leaves this screen. */
  onEditReadingPlan: (plan: ReadingPlanMetadata) => void;
}

/** Pane header title. A component so it can call `useI18n`. */
export function YourContentPaneTitle() {
  const { t } = useI18n();
  return <>{t("your-content", { defaultValue: "Your content" })}</>;
}

/* ----------------------------------------------------------------- helpers */

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
 * Expands a stored verse target into its numbers. Highlights and saves
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
  const verses = annotationVerseNumbers(annotation);
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
  onClear: () => void;
}) {
  const { state, stored } = props;
  const { t } = useI18n();
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
    // The menu is a sibling of the quote, as on the annotation card above: a
    // <button> cannot nest inside another one.
    <div className="sb-content-highlight-row">
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
      <ContextMenuWithButton
        icon="more_horiz"
        buttonClassName="sb-content-kebab"
        aria-label={t("more-options", { defaultValue: "More options" })}
      >
        <ContextMenuItem
          className="sb-content-menu-delete"
          onClick={props.onClear}
        >
          <MaterialIcon>delete</MaterialIcon>
          {t("clear-highlight", { defaultValue: "Clear highlight" })}
        </ContextMenuItem>
      </ContextMenuWithButton>
    </div>
  );
}

function SavePill(props: {
  state: SeedBibleState;
  save: Save;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { state, save } = props;
  const { t, language } = useI18n();
  const bookNames = state.today.bookNames.value;
  const verse = verseNumbersOf(save.verse)[0];
  const book = bookNames.get(save.bookId) ?? save.bookId;

  const location = {
    translationId: save.translationId,
    bookId: save.bookId,
    chapterNumber: save.chapterNumber,
    ...(save.verse !== undefined ? { verse: save.verse } : {}),
  };

  return (
    // The pill and its menu are siblings inside the surface, because a
    // <button> cannot nest inside another one.
    <div className="sb-content-save-row">
      <button
        type="button"
        className="sb-content-save"
        onClick={() =>
          props.onOpenPassage({
            bookId: save.bookId,
            chapter: save.chapterNumber,
            verse,
            translationId: save.translationId,
          })
        }
      >
        <span className="sb-content-save-name">
          {`${book} ${save.chapterNumber}${verse ? `:${verse}` : ""}`}
        </span>
        <span
          className={`sb-content-save-kind${
            verse ? " sb-content-save-kind-verse" : ""
          }`}
        >
          {verse
            ? t("verse", { defaultValue: "Verse" })
            : t("chapter", { defaultValue: "Chapter" })}
        </span>
        <span className="sb-content-save-date">
          {formatDate(save.createdAt, language, "short")}
        </span>
      </button>
      <ContextMenuWithButton
        buttonClassName="sb-content-save-menu"
        aria-label={t("save-options", { defaultValue: "Save options" })}
        title={t("save-options", { defaultValue: "Save options" })}
      >
        <ContextMenuItem
          onClick={() => openSaveModalForLocation(state, location)}
        >
          {t("edit-save", { defaultValue: "Edit save" })}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            // Removes the save outright, not from one folder: this list is
            // flat, so there is no folder to remove it from. That is what the
            // edit modal's own "Remove from all folders" does.
            void state.saves.removeSave(save.id);
          }}
        >
          {t("remove-save", { defaultValue: "Remove save" })}
        </ContextMenuItem>
      </ContextMenuWithButton>
    </div>
  );
}

function ReadingPlanRow(props: {
  state: SeedBibleState;
  plan: ReadingPlanMetadata;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const { state, plan } = props;
  const { t } = useI18n();
  const status = readingPlanStatusLabel(state.readingPlans, plan, t);
  const title =
    plan.title ?? t("untitled-reading-plan", { defaultValue: "Untitled plan" });

  return (
    // Laid out as a Discover row, like the playlists beside it, so a plan
    // reads the same way a playlist does on this screen.
    <li
      className="sb-discover-item sb-discover-item--row sb-content-plan"
      dir="auto"
      onClick={props.onOpen}
    >
      <HeroImageThumb url={plan.heroImageUrl} />
      <div className="sb-discover-item-main">
        <span className="sb-discover-item-title">{title}</span>
        {status ? (
          <span className="sb-content-plan-status">{status}</span>
        ) : null}
      </div>
      <ContextMenuWithButton
        buttonClassName="sb-discover-item-menu"
        aria-label={t("reading-plan-options", { defaultValue: "Plan options" })}
        onClick={(e) => e.stopPropagation()}
      >
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            props.onEdit();
          }}
        >
          <MaterialIcon className="sb-context-menu-item-icon">
            edit
          </MaterialIcon>
          {t("edit-reading-plan", { defaultValue: "Edit plan" })}
        </ContextMenuItem>
        <ContextMenuItem
          className="sb-context-menu-item--danger"
          onClick={(e) => {
            e.stopPropagation();
            openDeleteReadingPlanConfirm(
              state.modals,
              state.readingPlans,
              plan,
              title,
              state.app.toast
            );
          }}
        >
          <MaterialIcon className="sb-context-menu-item-icon">
            delete
          </MaterialIcon>
          {t("reading-plan-delete", { defaultValue: "Delete" })}
        </ContextMenuItem>
      </ContextMenuWithButton>
    </li>
  );
}

/**
 * Where the user is with a plan, in a few words: "Draft" for one still being
 * written, "Not started" for one never begun, "Day 3 of 10" (or "2/5
 * sessions" for a self-paced read) while it is under way, and "Completed"
 * once every day is done.
 *
 * Progress is worked out from the full plan, which loads a moment after the
 * list. Until it has, a started plan has no status rather than a wrong one.
 */
function readingPlanStatusLabel(
  readingPlans: ReadingPlansManager,
  plan: ReadingPlanMetadata,
  t: ReturnType<typeof useI18n>["t"]
): string | null {
  if (plan.status === "draft") {
    return t("reading-plan-draft", { defaultValue: "Draft" });
  }
  const planId = formatReadingPlanId(plan.recordName, plan.address);
  const progress = latestReadingPlanProgress(
    readingPlans.userReadingPlanProgresses.value,
    planId
  );
  if (!progress) {
    return t("reading-plan-not-started", { defaultValue: "Not started" });
  }
  const full = readingPlans.fullReadingPlans.value.find(
    (p) => p.recordName === plan.recordName && p.address === plan.address
  );
  if (!full) {
    return null;
  }
  const nowMs = Date.now();
  const summary = summarizeCalendar(
    getReadingCalendar(full, progress, nowMs),
    nowMs,
    progress.timeZone
  );
  if (summary.totalDays > 0 && summary.doneDays === summary.totalDays) {
    return t("reading-plan-completed", { defaultValue: "Completed" });
  }
  if (progress.selfPaced) {
    return t("reading-plan-progress-sessions", {
      defaultValue: "{{done}}/{{total}} sessions",
      done: summary.doneDays,
      total: summary.totalDays,
    });
  }
  return t("plan-day-of", {
    defaultValue: "Day {{day}} of {{total}}",
    day: summary.nextDayNumber ?? summary.doneDays + 1,
    total: summary.totalDays,
  });
}

function ConfirmDeleteReadingPlanModalContent(props: {
  readingPlans: ReadingPlansManager;
  plan: ReadingPlanMetadata;
  title: string;
  toast: SeedBibleState["app"]["toast"];
  onClose: () => void;
}) {
  const { readingPlans, plan, title, toast, onClose } = props;
  const { t } = useI18n();

  const confirm = async () => {
    try {
      await readingPlans.deleteReadingPlan(plan);
    } catch (error) {
      console.error("Error deleting reading plan:", error);
      toast(
        t("delete-reading-plan-failed", {
          defaultValue: "Couldn't delete the reading plan.",
        })
      );
    }
    onClose();
  };

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("delete-reading-plan-confirm-message", {
          title,
          defaultValue: 'Delete "{{title}}"? This can\'t be undone.',
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={() => void confirm()}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

/**
 * Asks before deleting a plan, the way the playlist row on this screen does.
 * Deleting erases the plan and the user's progress through it for good, so a
 * tap that was meant to open the menu must not be enough on its own.
 */
function openDeleteReadingPlanConfirm(
  modals: ModalManager,
  readingPlans: ReadingPlansManager,
  plan: ReadingPlanMetadata,
  title: string,
  toast: SeedBibleState["app"]["toast"]
) {
  const modalId = `delete-reading-plan-confirm-${plan.address}`;
  modals.openModal({
    id: modalId,
    title: {
      key: "delete-reading-plan-confirm-title",
      defaultValue: "Delete reading plan?",
    },
    content: () => (
      <ConfirmDeleteReadingPlanModalContent
        readingPlans={readingPlans}
        plan={plan}
        title={title}
        toast={toast}
        onClose={() => modals.closeModal(modalId)}
      />
    ),
  });
}

/* ------------------------------------------------------------------ screen */

/**
 * The "Your content" screen (issue #1553): everything the reader has made —
 * annotations, highlights, saves, playlists and reading plans — in one place,
 * filtered by a search box and a row of chips.
 *
 * "All" shows the first few of each section with a "See all" that switches
 * the chips to that one section in full.
 */
export function YourContentPane(props: YourContentScreenProps) {
  const { state, onOpenPassage } = props;
  const { yourContent, saves, playlists, annotations, readingPlans } = state;
  const { t } = useI18n();

  // Reading plans are still behind a feature flag. With it off the user can't
  // make one, so the chip and the section go too rather than sitting empty.
  const plansEnabled = state.features.isFeatureEnabled(
    FEATURE_KEY_READING_PLANS
  ).value;
  const contentFilters = plansEnabled
    ? CONTENT_FILTERS
    : CONTENT_FILTERS.filter((value) => value !== "reading-plans");

  // Every open refreshes, so a verse highlighted or annotated in the reader
  // since the last visit shows up. It's quiet when content is already
  // loaded: the lists stay put instead of blanking to a spinner.
  useEffect(() => {
    void yourContent.load({ force: true });
  }, []);

  // Highlights carry no words of their own, so searching them means reading
  // their chapters back. Kicked off on the first search rather than on open:
  // someone who never types costs nothing, and someone who does pays once.
  useEffect(() => {
    if (yourContent.query.value.trim().length > 0) {
      void yourContent.readHighlightVerseText();
    }
  }, [yourContent.query.value.trim().length > 0]);

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

  /**
   * What a reference is searchable by: the reference exactly as its own row
   * prints it, so anything you can read on screen you can type — "John",
   * "John 3" and "John 3:16" all reach a highlight of John 3:16. Plus the raw
   * book id, which is both what a row falls back to before book names have
   * loaded and what someone typing "JHN" means.
   *
   * Matching is substring, as everywhere in this box, so "Psalm 3" also
   * reaches Psalm 30. Narrowing that would mean parsing the query as a
   * reference rather than searching text.
   */
  const referenceFields = (
    bookId: string,
    chapterNumber: number,
    verses: number[]
  ): string[] => [
    formatReference(bookNames, bookId, chapterNumber, verses),
    bookId,
  ];

  const visibleAnnotations = yourContent.annotations.value.filter((a) =>
    matches(
      annotationPlainText(a),
      ...referenceFields(a.bookId, a.chapterNumber, annotationVerseNumbers(a))
    )
  );
  const verseTextByHighlight = yourContent.highlightVerseText.value;
  const visibleHighlights = yourContent.highlights.value.filter((h) =>
    matches(
      ...referenceFields(
        h.bookId,
        h.chapterNumber,
        verseNumbersOf(h.highlight.verse)
      ),
      // The words the highlight is of, once they have been read back. A
      // range matches on any of its verses, which is what the highlight
      // covers even though the row quotes only the first.
      verseTextByHighlight.get(highlightKey(h))
    )
  );
  const visibleSaves = saves.saves.value.filter((b) =>
    matches(
      ...referenceFields(b.bookId, b.chapterNumber, verseNumbersOf(b.verse))
    )
  );
  const visiblePlaylists = playlists.userPlaylists.value.filter((p) =>
    matches(p.title, p.description)
  );
  // Newest first, like annotations. The list arrives in record order, which
  // is no order a reader would recognise.
  const visibleReadingPlans = plansEnabled
    ? readingPlans.userReadingPlans.value
        .filter((p) => matches(p.title, p.description))
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
    : [];

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
      case "saves":
        return t("saves", { defaultValue: "Saves" });
      case "playlists":
        return t("playlists", { defaultValue: "Playlists" });
      case "reading-plans":
        return t("reading-plans", { defaultValue: "Reading plans" });
    }
  };

  const sectionCounts: Record<Exclude<ContentFilter, "all">, number> = {
    annotations: visibleAnnotations.length,
    highlights: visibleHighlights.length,
    saves: visibleSaves.length,
    playlists: visiblePlaylists.length,
    "reading-plans": visibleReadingPlans.length,
  };

  /**
   * Nothing to show *for the chip that's selected*. Counting every section
   * instead would leave a chosen-but-empty section as a blank screen, because
   * the sections it isn't showing still had content.
   */
  const stillSearching =
    needle.length > 0 && yourContent.isReadingHighlightVerseText.value;

  const nothingToShow =
    status === "ready" &&
    !stillSearching &&
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
      case "saves":
        return t("your-content-empty-saves", {
          defaultValue: "Passages you save will show up here.",
        });
      case "playlists":
        return t("your-content-empty-playlists", {
          defaultValue: "Playlists you create will show up here.",
        });
      case "reading-plans":
        return t("your-content-empty-reading-plans", {
          defaultValue: "Reading plans you create will show up here.",
        });
      case "all":
        return t("your-content-empty", {
          defaultValue:
            "Notes, highlights, saves, playlists and reading plans you make will show up here.",
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
          {contentFilters.map((value) => (
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

        {status === "loading" || stillSearching ? (
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
                    onClear={() => {
                      // Same optimistic pattern as deleting an annotation
                      // above: drop it now so a cleared highlight does not sit
                      // on screen waiting for the server, and put it back if
                      // the call fails.
                      yourContent.removeHighlight(stored);
                      void state.highlights
                        .unhighlightVerse(
                          stored.translationId,
                          stored.bookId,
                          stored.chapterNumber,
                          stored.highlight.verse
                        )
                        .catch((error) => {
                          console.error("Error clearing highlight:", error);
                          yourContent.restoreHighlight(stored);
                        });
                    }}
                    key={`${stored.translationId}/${stored.bookId}/${stored.chapterNumber}/${index}`}
                    state={state}
                    stored={stored}
                    onOpenPassage={onOpenPassage}
                  />
                ))}
            </div>
          </section>
        ) : null}

        {showing("saves") && visibleSaves.length > 0 ? (
          <section className="sb-content-section">
            <SectionHeader
              title={t("saves", { defaultValue: "Saves" })}
              onSeeAll={seeAll("saves", visibleSaves)}
            />
            <div className="sb-content-saves">
              {visibleSaves.slice(0, limit(visibleSaves)).map((b) => (
                <SavePill
                  key={b.id}
                  state={state}
                  save={b}
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
            <ul className="sb-discover-list">
              {visiblePlaylists.slice(0, limit(visiblePlaylists)).map((p) => (
                <PlaylistRow
                  key={p.id}
                  playlist={p}
                  playlists={playlists}
                  modals={state.modals}
                  toast={state.app.toast}
                  onPlay={props.onPlayPlaylist}
                  onEdit={props.onEditPlaylist}
                />
              ))}
            </ul>
          </section>
        ) : null}

        {showing("reading-plans") && visibleReadingPlans.length > 0 ? (
          <section className="sb-content-section">
            <SectionHeader
              title={t("reading-plans", { defaultValue: "Reading plans" })}
              onSeeAll={seeAll("reading-plans", visibleReadingPlans)}
            />
            <ul className="sb-discover-list">
              {visibleReadingPlans
                .slice(0, limit(visibleReadingPlans))
                .map((plan) => (
                  <ReadingPlanRow
                    key={formatReadingPlanId(plan.recordName, plan.address)}
                    state={state}
                    plan={plan}
                    onOpen={() => props.onOpenReadingPlan(plan)}
                    onEdit={() => props.onEditReadingPlan(plan)}
                  />
                ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
