import type { BibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type {
  Pane,
  PanePlacement,
  SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import {
  createRefsWithText,
  getVerseReferences,
  selectTopReferences,
} from "./utils";
import type {
  CrossReference,
  CrossReferenceWithText,
  ReferenceId,
} from "./interfaces";
import { useSignal } from "@preact/signals";
import type { Signal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import { Skeleton, SkeletonContainer } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import "./referenceApp.css";

const PLACEHOLDER_LINE_WIDTHS = ["100%", "72%"];

const PAGE_SIZE = 10;

/**
 * Placeholder rows shown while a verse's reference list is on its way. The real
 * count is unknown until it lands, so this is just enough to read as a list.
 */
const PENDING_ROW_COUNT = 5;

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
 * the verse toolbar and every drill-down from inside a pane all replace the
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
  const paneId = `ext_references-pane-${nextPaneSequence++}`;
  const isMobile = seedBibleState.app.isMobile.value;

  if (previousPane) {
    seedBibleState.panes.closePane(previousPane.id);
  }

  currentPane.value = seedBibleState.panes.openPane({
    id: paneId,
    placement: options.placement ?? previousPane?.placement ?? "floating",
    title,
    component: () => (
      <ReferenceApp
        translationId={translationId}
        references={references}
        referenceById={referenceById}
        currentPane={currentPane}
        seedBibleState={seedBibleState}
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
        options?.placement === "floating"
          ? "grid_layout_side"
          : "float_portrait_2";
      return (
        <button
          class="sb-pane-header-close-button material-symbols-outlined"
          onClick={() =>
            openReferencePane({
              ...options,
              placement:
                options?.placement === "floating" ? "side" : "floating",
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

const ReferenceApp = (props: {
  translationId: string;
  references?: CrossReference[];
  referenceById?: ReferenceId;
  currentPane: Signal<Pane | null>;
  seedBibleState: SeedBibleState;
}) => {
  const { translationId, referenceById, seedBibleState, currentPane } = props;
  const dataManager: BibleDataManager = seedBibleState.bibleData;
  const { t } = useI18n("ext_references");

  const refsWithText = useSignal<CrossReferenceWithText[] | null>(null);
  const failed = useSignal(false);
  const limit = useSignal(PAGE_SIZE);

  /** The list fetched for `referenceById`; null until it lands. */
  const fetchedReferences = useSignal<CrossReference[] | null>(null);
  const listFailed = useSignal(false);

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

  const referencesKey = (references ?? [])
    .map(
      (ref) => `${ref.book}.${ref.chapter}.${ref.verse}.${ref.endVerse ?? ""}`
    )
    .join("|");

  const rankedReferences = useMemo(
    () => selectTopReferences(references ?? [], references?.length ?? 0),
    [referencesKey]
  );

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

  const unavailableNote = (
    <p className="sb-references-item-note">
      {t("text-unavailable", { defaultValue: "Verse text unavailable." })}
    </p>
  );

  const showMoreLabel = t("show-more", {
    defaultValue: "Show more references",
  });
  const openLabel = t("open-in-new-pane", {
    defaultValue: "Show this verse's own references",
  });

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
      title: `${formatReference(reference, nameOf(reference.book))} ${t("title", { defaultValue: "References" })}`,
    });
  };

  if (listFailed.value) {
    return (
      <div className="sb-references-pane sb-references-pane--empty">
        <span
          className="material-symbols-outlined sb-references-empty-icon"
          aria-hidden="true"
        >
          quick_reference_all
        </span>
        <p className="sb-references-empty-text">
          {t("references-unavailable", {
            defaultValue: "Could not load the references for this verse.",
          })}
        </p>
      </div>
    );
  }

  if (!references) {
    return (
      <div className="sb-references-pane">
        <ul className="sb-references-list">
          {Array.from({ length: PENDING_ROW_COUNT }, (_, index) => (
            <li className="sb-references-item" key={`pending-${index}`}>
              <span className="sb-references-item-label sb-references-item-label-pending">
                <Skeleton shape="line" width="5.5rem" />
              </span>
              <div className="sb-references-item-body">
                <SkeletonContainer
                  label={t("loading-list", {
                    defaultValue: "Loading references",
                  })}
                  className="sb-references-item-placeholder"
                >
                  {PLACEHOLDER_LINE_WIDTHS.map((width) => (
                    <Skeleton key={width} shape="line" width={width} />
                  ))}
                </SkeletonContainer>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (topReferences.length === 0) {
    return (
      <div className="sb-references-pane sb-references-pane--empty">
        <span
          className="material-symbols-outlined sb-references-empty-icon"
          aria-hidden="true"
        >
          quick_reference_all
        </span>
        <p className="sb-references-empty-text">
          {t("no-references", {
            defaultValue: "No cross references for this verse.",
          })}
        </p>
      </div>
    );
  }

  const textByReference = new Map(
    (refsWithText.value ?? []).map((reference) => [
      referenceKey(reference),
      reference.text,
    ])
  );

  const openChapter = (reference: CrossReference) => {
    const newTab = seedBibleState.tabs.addTab(undefined, {
      initialTranslationId: translationId,
      initialBookId: reference.book,
      initialChapterNumber: reference.chapter,
      scrollToVerse: reference.verse,
    });

    seedBibleState.app.selectTab(newTab.id);

    openReference(reference);
  };

  return (
    <div className="sb-references-pane">
      <ul className="sb-references-list">
        {topReferences.map((reference) => {
          const key = referenceKey(reference);
          const text = textByReference.get(key);

          return (
            <li className="sb-references-item" key={key}>
              <span
                className="sb-references-item-label"
                onClick={() => openReference(reference)}
              >
                {formatReference(reference, nameOf(reference.book))}
              </span>
              <button
                type="button"
                className="sb-references-item-open"
                onClick={() => openChapter(reference)}
                title={openLabel}
                aria-label={openLabel}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  open_in_new
                </span>
              </button>
              <div className="sb-references-item-body">
                {text !== undefined ? (
                  text ? (
                    <p className="sb-references-item-text">{text}</p>
                  ) : (
                    unavailableNote
                  )
                ) : failed.value ? (
                  unavailableNote
                ) : (
                  <SkeletonContainer
                    label={t("loading-references", {
                      defaultValue: "Loading verse text",
                    })}
                    className="sb-references-item-placeholder"
                  >
                    {PLACEHOLDER_LINE_WIDTHS.map((width) => (
                      <Skeleton key={width} shape="line" width={width} />
                    ))}
                  </SkeletonContainer>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button
          type="button"
          className="sb-references-more"
          onClick={() => {
            limit.value += PAGE_SIZE;
          }}
          title={showMoreLabel}
          aria-label={showMoreLabel}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            expand_more
          </span>
        </button>
      )}
    </div>
  );
};

function formatReference(reference: CrossReference, bookName: string): string {
  const { chapter, verse, endVerse } = reference;
  const verses = endVerse && endVerse > verse ? `${verse}-${endVerse}` : verse;
  return `${bookName} ${chapter}:${verses}`;
}

function referenceKey(reference: CrossReference): string {
  return `${reference.book}-${reference.chapter}-${reference.verse}-${reference.endVerse ?? ""}`;
}

function buildBookNames(
  dataManager: BibleDataManager,
  translationId: string
): Map<string, string> {
  const books = dataManager.getCachedTranslationBooks(translationId);
  return new Map(
    books?.books.map((book) => [book.id, book.commonName || book.name]) ?? []
  );
}
