import type {
  BibleDataManager,
  BookId,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  emphasizeVerses,
  type Pane,
  type PanePlacement,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import {
  buildBookNames,
  createRefsWithText,
  formatReference,
  getVerseReferences,
  groupReferencesBySection,
  referenceKey,
  referenceSectionOf,
  selectTopReferences,
} from "./utils";
import type {
  CrossReference,
  CrossReferenceWithText,
  ReferenceId,
  ReferenceSection,
} from "./interfaces";
import { signal, useSignal } from "@preact/signals";
import type { Signal } from "@preact/signals";
import { useEffect, useLayoutEffect, useMemo, useRef } from "preact/hooks";
import { Skeleton, SkeletonContainer } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { ReferenceBody, ReferencePreview } from "./referenceText";
import type { ReferenceText } from "./referenceText";
import "./referenceApp.css";

const PAGE_SIZE = 10;

/**
 * Placeholder rows shown while a verse's reference list is on its way. The real
 * count is unknown until it lands, so this is just enough to read as a list.
 */
const PENDING_ROW_COUNT = 5;

/**
 * Pane width, in pixels, from which the list sits beside the selected
 * reference's text instead of expanding in place. Below it there isn't room
 * for both columns to stay readable.
 */
const SPLIT_LAYOUT_MIN_WIDTH = 540;

/** Opens floating panes wide and tall enough for the side-by-side layout. */
const FLOATING_PANE_SIZE = { width: 600, height: 560 };

const SECTION_LABELS: Record<
  ReferenceSection,
  { key: string; defaultValue: string }
> = {
  law: { key: "section-law", defaultValue: "Law" },
  history: { key: "section-history", defaultValue: "History" },
  wisdom: { key: "section-wisdom", defaultValue: "Wisdom" },
  prophets: { key: "section-prophets", defaultValue: "Prophets" },
  "new-testament": {
    key: "section-new-testament",
    defaultValue: "New Testament",
  },
  other: { key: "section-other", defaultValue: "Other" },
};

let nextPaneSequence = 1;

/**
 * Swaps whichever reference pane is open for one showing a verse's
 * cross-references.
 *
 * Give it `references` when the list is already in hand, or `referenceById`
 * when it isn't — the pane then opens straight away and fetches its own list
 * rather than making the caller wait on the network.
 *
 * `currentPane` is the shared handle on "the reference pane that's open", so
 * the verse toolbar and every drill-down from inside a pane all reuse the
 * same pane instead of stacking them up.
 */
export function openReferencePane(options: {
  seedBibleState: SeedBibleState;
  currentPane: Signal<Pane | null>;
  translationId: string;
  references?: CrossReference[];
  referenceById?: ReferenceId;
  title: string;
  placement?: PanePlacement;
}): Pane {
  const {
    seedBibleState,
    currentPane,
    translationId,
    references,
    referenceById,
    title,
  } = options;
  const previousPane = currentPane.value;
  const isMobile = seedBibleState.app.isMobile.value;
  const placement = options.placement ?? previousPane?.placement ?? "floating";
  const referenceCount = signal<number | null>(null);

  // Reopening under the open pane's id updates it in place, so it keeps the
  // spot and size the user gave it. A pane's placement can't change, so moving
  // between floating and docked needs a fresh pane.
  const reusesPane = previousPane?.placement === placement;
  const paneId =
    reusesPane && previousPane
      ? previousPane.id
      : `ext_references-pane-${nextPaneSequence++}`;

  if (previousPane && !reusesPane) {
    seedBibleState.panes.closePane(previousPane.id);
  }

  const size = placement === "floating" ? FLOATING_PANE_SIZE : undefined;

  currentPane.value = seedBibleState.panes.openPane({
    id: paneId,
    placement,
    size,
    title: () => <ReferencePaneTitle title={title} count={referenceCount} />,
    component: () => (
      <ReferenceApp
        translationId={translationId}
        references={references}
        referenceById={referenceById}
        currentPane={currentPane}
        seedBibleState={seedBibleState}
        referenceCount={referenceCount}
      />
    ),
    onClose: () => {
      if (currentPane.value?.id === paneId) {
        currentPane.value = null;
      }
    },
    header: () => {
      if (isMobile) {
        return null;
      }
      const headerIcon =
        placement === "floating" ? "grid_layout_side" : "float_portrait_2";
      return (
        <button
          class="sb-pane-header-close-button sb-references-header-button material-symbols-outlined"
          onClick={() =>
            openReferencePane({
              ...options,
              placement: placement === "floating" ? "side" : "floating",
            })
          }
        >
          {headerIcon}
        </button>
      );
    },
  });

  return currentPane.value;
}

function ReferencePaneTitle(props: {
  title: string;
  count: Signal<number | null>;
}) {
  const { t } = useI18n("ext_references");
  const count = props.count.value;

  return (
    <span className="sb-references-title">
      <span className="sb-references-title-reference">{props.title}</span>
      {count !== null && (
        <span className="sb-references-title-count">
          {t("cross-reference-count", {
            count,
            defaultValue: "{{count}} cross-references",
          })}
        </span>
      )}
    </span>
  );
}

/** What both layouts need to render the list of references. */
interface ReferenceViewProps {
  /** The references loaded so far, strongest first. */
  references: CrossReference[];
  /** Every reference, loaded or not, strongest first. */
  allReferences: CrossReference[];
  /**
   * The reference the reader is on, shared by both layouts so resizing the
   * pane across the breakpoint keeps their place. Null until they pick one.
   */
  selectedKey: Signal<string | null>;
  hasMore: boolean;
  onShowMore: () => void;
  labelOf: (reference: CrossReference) => string;
  textOf: (reference: CrossReference) => ReferenceText;
  onGoToChapter: (reference: CrossReference) => void;
  /** Shows the reference's own cross-references in this pane. */
  onOpenReference: (reference: CrossReference) => void;
}

const ReferenceApp = (props: {
  translationId: string;
  references?: CrossReference[];
  referenceById?: ReferenceId;
  currentPane: Signal<Pane | null>;
  seedBibleState: SeedBibleState;
  referenceCount: Signal<number | null>;
}) => {
  const {
    translationId,
    referenceById,
    seedBibleState,
    currentPane,
    referenceCount,
  } = props;
  const dataManager: BibleDataManager = seedBibleState.bibleData;
  const { t } = useI18n("ext_references");

  const refsWithText = useSignal<CrossReferenceWithText[] | null>(null);
  const failed = useSignal(false);
  const limit = useSignal(PAGE_SIZE);

  /** The list fetched for `referenceById`; null until it lands. */
  const fetchedReferences = useSignal<CrossReference[] | null>(null);
  const listFailed = useSignal(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const isWide = useSignal(false);
  const selectedKey = useSignal<string | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") {
      return;
    }

    const update = (width: number) => {
      isWide.value = width >= SPLIT_LAYOUT_MIN_WIDTH;
    };
    update(root.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        update(entry.contentRect.width);
      }
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const referenceIdKey = referenceById
    ? `${referenceById.bookId}.${referenceById.chapter}.${referenceById.verse}`
    : null;

  useEffect(() => {
    if (props.references || !referenceById) {
      return;
    }

    let active = true;
    fetchedReferences.value = null;
    listFailed.value = false;

    getVerseReferences(referenceById)
      .then((verseReferences) => {
        if (active) {
          fetchedReferences.value = verseReferences;
        }
      })
      .catch((error: unknown) => {
        console.error("Could not load the references for this verse", error);
        if (active) {
          listFailed.value = true;
        }
      });

    return () => {
      active = false;
    };
  }, [referenceIdKey]);

  const references = props.references ?? fetchedReferences.value;

  const referencesKey = (references ?? []).map(referenceKey).join("|");

  const rankedReferences = useMemo(
    () => selectTopReferences(references ?? [], references?.length ?? 0),
    [referencesKey]
  );

  useEffect(() => {
    referenceCount.value = references ? rankedReferences.length : null;
  }, [rankedReferences, references === null]);

  const topReferences = rankedReferences.slice(0, limit.value);
  const hasMore = rankedReferences.length > topReferences.length;

  const bookNames = useSignal(buildBookNames(dataManager, translationId));

  useEffect(() => {
    if (bookNames.value.size > 0) {
      return;
    }

    let active = true;
    dataManager
      .getTranslationBooks(translationId)
      .then(() => {
        if (active) {
          bookNames.value = buildBookNames(dataManager, translationId);
        }
      })
      .catch((error: unknown) => {
        console.warn("Could not load book names for references", error);
      });

    return () => {
      active = false;
    };
  }, [translationId, dataManager]);

  useEffect(() => {
    refsWithText.value = null;
    failed.value = false;
  }, [referencesKey, translationId]);

  useEffect(() => {
    if (!references) {
      return;
    }

    let active = true;

    createRefsWithText({
      references,
      limit: limit.value,
      dataManager,
      translationId,
    })
      .then((refsWithTextData) => {
        if (active) {
          refsWithText.value = refsWithTextData;
        }
      })
      .catch((error: unknown) => {
        console.error("Could not load the text for these references", error);
        if (active) {
          failed.value = true;
        }
      });

    return () => {
      active = false;
    };
  }, [referencesKey, translationId, dataManager, limit.value]);

  const nameOf = (referencedBookId: string) =>
    bookNames.value.get(referencedBookId) ?? referencedBookId;

  const labelOf = (reference: CrossReference) =>
    formatReference(reference, nameOf(reference.book));

  const openReference = (reference: CrossReference) => {
    openReferencePane({
      seedBibleState,
      currentPane,
      translationId,
      referenceById: {
        bookId: reference.book,
        chapter: reference.chapter,
        verse: reference.verse,
      },
      title: labelOf(reference),
    });
  };

  const openChapter = (reference: CrossReference) => {
    const newTab = seedBibleState.tabs.addTab(undefined, {
      initialTranslationId: translationId,
      initialBookId: reference.book,
      initialChapterNumber: reference.chapter,
      scrollToVerse: reference.verse,
    });

    // `scrollToVerse` only scrolls; the highlight is a separate decoration,
    // the same brief spotlight the reader gives any other verse jump.
    emphasizeVerses(newTab.readingState, {
      book: reference.book as BookId,
      chapter: reference.chapter,
      verse: reference.verse,
      endVerse: reference.endVerse,
    });

    seedBibleState.app.selectTab(newTab.id);

    openReference(reference);
  };

  const versesByReference = new Map(
    (refsWithText.value ?? []).map((reference) => [
      referenceKey(reference),
      reference.verses,
    ])
  );

  const textOf = (reference: CrossReference): ReferenceText => {
    const verses = versesByReference.get(referenceKey(reference));
    if (verses) {
      return verses.length > 0
        ? { status: "ready", verses }
        : { status: "unavailable" };
    }
    return failed.value ? { status: "unavailable" } : { status: "loading" };
  };

  const renderContent = () => {
    if (listFailed.value) {
      return (
        <EmptyState
          message={t("references-unavailable", {
            defaultValue: "Could not load the references for this verse.",
          })}
        />
      );
    }

    if (!references) {
      return (
        <div className="sb-references-pane">
          <SkeletonContainer
            label={t("loading-list", { defaultValue: "Loading references" })}
            className="sb-references-rows"
          >
            {Array.from({ length: PENDING_ROW_COUNT }, (_, index) => (
              <div className="sb-references-row-pending" key={index}>
                <Skeleton shape="line" width="6.5rem" />
                <Skeleton shape="line" width="70%" />
              </div>
            ))}
          </SkeletonContainer>
        </div>
      );
    }

    if (topReferences.length === 0) {
      return (
        <EmptyState
          message={t("no-references", {
            defaultValue: "No cross references for this verse.",
          })}
        />
      );
    }

    const viewProps: ReferenceViewProps = {
      references: topReferences,
      allReferences: rankedReferences,
      selectedKey,
      hasMore,
      onShowMore: () => {
        limit.value += PAGE_SIZE;
      },
      labelOf,
      textOf,
      onGoToChapter: openChapter,
      onOpenReference: openReference,
    };

    return isWide.value ? (
      <ReferenceSplitView {...viewProps} />
    ) : (
      <ReferenceAccordion {...viewProps} />
    );
  };

  return (
    <div className="sb-references-root" ref={rootRef}>
      {renderContent()}
    </div>
  );
};

function EmptyState(props: { message: string }) {
  return (
    <div className="sb-references-pane sb-references-pane--empty">
      <span
        className="material-symbols-outlined sb-references-empty-icon"
        aria-hidden="true"
      >
        quick_reference_all
      </span>
      <p className="sb-references-empty-text">{props.message}</p>
    </div>
  );
}

let nextAccordionId = 1;

/**
 * The narrow layout: references filed under their section, each one opening
 * in place to show its text. One is open at a time, starting with the top
 * row, so the open one is never scrolled out of sight.
 */
function ReferenceAccordion(props: ReferenceViewProps) {
  const {
    references,
    selectedKey,
    hasMore,
    onShowMore,
    labelOf,
    textOf,
    onGoToChapter,
    onOpenReference,
  } = props;
  const { t } = useI18n("ext_references");
  const idPrefix = useMemo(() => `sb-references-${nextAccordionId++}`, []);
  const paneRef = useRef<HTMLDivElement>(null);
  /** Set when the reader closes the open row, leaving every row closed. */
  const isCollapsed = useSignal(false);
  /** How many references were loaded when "Show more" was pressed. */
  const revealFrom = useRef<number | null>(null);

  const sections = groupReferencesBySection(references);
  const firstRow = sections[0]?.references[0];
  const selectedIsShown = references.some(
    (reference) => referenceKey(reference) === selectedKey.value
  );
  const expandedKey = isCollapsed.value
    ? null
    : selectedIsShown
      ? selectedKey.value
      : firstRow
        ? referenceKey(firstRow)
        : null;

  // Newly loaded references are filed into their sections, often above the
  // "Show more" button the reader is looking at. Opening the strongest new
  // one and scrolling to it shows where the new page landed.
  useEffect(() => {
    const from = revealFrom.current;
    const firstNew = from !== null ? references[from] : undefined;
    if (!firstNew) {
      return;
    }
    revealFrom.current = null;
    const key = referenceKey(firstNew);
    selectedKey.value = key;
    isCollapsed.value = false;
    paneRef.current
      ?.querySelector(`[data-reference-key="${key}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [references.length]);

  const goToChapterLabel = t("go-to-chapter", {
    defaultValue: "Go to chapter",
  });
  const showOwnReferencesLabel = t("show-own-references", {
    defaultValue: "Show this verse's own references",
  });

  return (
    <div className="sb-references-pane" ref={paneRef}>
      {sections.map(({ section, references }) => (
        <section className="sb-references-section" key={section}>
          <h3 className="sb-references-section-title">
            {t(SECTION_LABELS[section].key, {
              defaultValue: SECTION_LABELS[section].defaultValue,
            })}
          </h3>
          <ul className="sb-references-rows">
            {references.map((reference) => {
              const key = referenceKey(reference);
              const isExpanded = expandedKey === key;
              const text = textOf(reference);
              const bodyId = `${idPrefix}-${key}`;
              const label = labelOf(reference);
              const toggle = () => {
                if (isExpanded) {
                  isCollapsed.value = true;
                } else {
                  selectedKey.value = key;
                  isCollapsed.value = false;
                }
              };

              return (
                <li
                  className={`sb-references-row${isExpanded ? " is-expanded" : ""}`}
                  key={key}
                  data-reference-key={key}
                >
                  {/* The whole row toggles on click as a convenience; the
                      chevron is the real toggle for keyboard and screen
                      readers, and the title opens the verse's own
                      references instead. */}
                  <div className="sb-references-row-head" onClick={toggle}>
                    <span className="sb-references-row-heading">
                      <button
                        type="button"
                        className="sb-references-title-link"
                        onClick={(event: MouseEvent) => {
                          event.stopPropagation();
                          onOpenReference(reference);
                        }}
                        title={showOwnReferencesLabel}
                      >
                        <span className="sb-references-row-reference">
                          {label}
                        </span>
                      </button>
                      <span
                        className="sb-references-collapsible sb-references-row-preview-wrap"
                        aria-hidden={isExpanded}
                      >
                        <ReferencePreview text={text} />
                      </span>
                    </span>
                    <button
                      type="button"
                      className="sb-references-round-icon sb-references-row-chevron"
                      aria-expanded={isExpanded}
                      aria-controls={bodyId}
                      aria-label={t("show-reference-text", {
                        reference: label,
                        defaultValue: "Show the text of {{reference}}",
                      })}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        toggle();
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                      >
                        keyboard_arrow_down
                      </span>
                    </button>
                  </div>
                  {/* The button and body stay mounted while collapsed so
                      closing can animate; CSS hides them from focus and
                      screen readers once the animation ends. */}
                  <button
                    type="button"
                    className="sb-references-round-icon sb-references-row-open"
                    onClick={() => onGoToChapter(reference)}
                    title={goToChapterLabel}
                    aria-label={goToChapterLabel}
                  >
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      arrow_outward
                    </span>
                  </button>
                  <div
                    id={bodyId}
                    className="sb-references-collapsible sb-references-row-body-wrap"
                  >
                    <div className="sb-references-row-body">
                      <ReferenceBody text={text} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {hasMore && (
        <ShowMoreButton
          onClick={() => {
            revealFrom.current = references.length;
            onShowMore();
          }}
        />
      )}
    </div>
  );
}

/**
 * The wide layout: the list down the side and the selected reference's text
 * beside it, with paging through the list underneath.
 */
function ReferenceSplitView(props: ReferenceViewProps) {
  const {
    references,
    allReferences,
    selectedKey,
    hasMore,
    onShowMore,
    labelOf,
    textOf,
    onGoToChapter,
    onOpenReference,
  } = props;
  const { t } = useI18n("ext_references");
  const indexRef = useRef<HTMLUListElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const previousIndexRef = useRef(0);
  const total = allReferences.length;

  const selectedIndex = references.findIndex(
    (reference) => referenceKey(reference) === selectedKey.value
  );
  const index = Math.max(selectedIndex, 0);
  const selected = references[index];
  // Which way the new reference slides in: from the right when moving down
  // the list, from the left when moving back up.
  const direction = index < previousIndexRef.current ? "backward" : "forward";

  useEffect(() => {
    previousIndexRef.current = index;
    detailRef.current?.scrollTo?.({ top: 0 });
    indexRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [index]);

  if (!selected) {
    return null;
  }

  const select = (next: number) => {
    const target = allReferences[next];
    if (!target) {
      return;
    }
    // Paging past the loaded references loads the next page, so the pager
    // walks the whole list rather than stopping at the first page.
    if (next >= references.length && hasMore) {
      onShowMore();
    }
    selectedKey.value = referenceKey(target);
  };

  const section = SECTION_LABELS[referenceSectionOf(selected.book)];
  const previousLabel = t("previous-reference", {
    defaultValue: "Previous reference",
  });
  const nextLabel = t("next-reference", { defaultValue: "Next reference" });

  return (
    <div className="sb-references-pane sb-references-pane--split">
      <div className="sb-references-index">
        <ul className="sb-references-index-list" ref={indexRef}>
          {references.map((reference, referenceIndex) => {
            const isSelected = referenceIndex === index;
            return (
              <li key={referenceKey(reference)}>
                <button
                  type="button"
                  className="sb-references-index-item"
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => select(referenceIndex)}
                >
                  <span className="sb-references-row-reference">
                    {labelOf(reference)}
                  </span>
                  <ReferencePreview text={textOf(reference)} />
                </button>
              </li>
            );
          })}
        </ul>
        {hasMore && <ShowMoreButton onClick={onShowMore} />}
      </div>

      <div className="sb-references-detail">
        <div className="sb-references-detail-scroll" ref={detailRef}>
          {/* Keyed so each new reference mounts fresh and plays its entrance. */}
          <div
            className="sb-references-detail-content"
            data-direction={direction}
            key={referenceKey(selected)}
          >
            <p className="sb-references-detail-eyebrow">
              {t(section.key, { defaultValue: section.defaultValue })}
            </p>
            <h3 className="sb-references-detail-title">
              <button
                type="button"
                className="sb-references-title-link"
                onClick={() => onOpenReference(selected)}
                title={t("show-own-references", {
                  defaultValue: "Show this verse's own references",
                })}
              >
                {labelOf(selected)}
              </button>
            </h3>
            <ReferenceBody text={textOf(selected)} />
          </div>
        </div>

        <div className="sb-references-detail-footer">
          <button
            type="button"
            className="sb-references-pager-button"
            disabled={index === 0}
            onClick={() => select(index - 1)}
            title={previousLabel}
            aria-label={previousLabel}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            className="sb-references-pager-button sb-references-pager-button--next"
            disabled={index >= total - 1}
            onClick={() => select(index + 1)}
            title={nextLabel}
            aria-label={nextLabel}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              chevron_right
            </span>
          </button>
          <span className="sb-references-pager-position" aria-live="polite">
            {t("reference-position", {
              current: index + 1,
              total,
              defaultValue: "{{current}} of {{total}}",
            })}
          </span>
          <button
            type="button"
            className="sb-references-go-to-chapter"
            onClick={() => onGoToChapter(selected)}
          >
            {t("go-to-chapter", { defaultValue: "Go to chapter" })}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShowMoreButton(props: { onClick: () => void }) {
  const { t } = useI18n("ext_references");
  const label = t("show-more", { defaultValue: "Show more references" });

  return (
    <button
      type="button"
      className="sb-references-more"
      onClick={props.onClick}
      title={label}
      aria-label={label}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        expand_more
      </span>
    </button>
  );
}
