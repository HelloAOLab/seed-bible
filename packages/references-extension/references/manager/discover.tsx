import type {
  DiscoverProvider,
  DiscoverResult,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import type { BibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { BookId } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type {
  Pane,
  SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import { useSignal } from "@preact/signals";
import type { Signal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useI18n } from "seed-bible/i18n";
import type { CrossReference } from "./interfaces";
import {
  GetReferences,
  buildBookNames,
  formatReference,
  loadReferencePassage,
  referenceKey,
  selectTopReferences,
} from "./utils";
import { openReferencePane } from "./referenceApp";
import { ReferenceBody } from "./referenceText";
import type { ReferenceText } from "./referenceText";
import "./discover.css";

/** The kind of Discover content this extension contributes, one per verse. */
export const REFERENCES_CONTENT_TYPE = "cross_references";

/**
 * How many references a card lists as chips before the rest are folded into
 * a "+N more" chip that opens the full references pane.
 */
const CHIP_LIMIT = 6;

/**
 * Discover results for a chapter's cross-references: one card per verse that
 * has any, tagged with that verse so selecting it in the reader narrows the
 * list to its card.
 */
export function createReferencesDiscoverProvider(deps: {
  context: SeedBibleState;
  currentPane: Signal<Pane | null>;
}): DiscoverProvider {
  const { context, currentPane } = deps;

  return {
    id: "references-discover-provider",
    title: "Cross-references",
    description: "The cross-references of each verse in the chapter.",
    discover: async ({ book, chapter, translationId }) => {
      // Independent loads, and Discover waits on every provider before it
      // settles, so they run side by side rather than back to back.
      const [chapterReferences] = await Promise.all([
        GetReferences({ bookId: book, chapter }).catch((error: unknown) => {
          // Failing here would take the other providers' results down too.
          console.warn("Could not load cross-references for Discover", error);
          return null;
        }),
        context.bibleData
          .getTranslationBooks(translationId)
          .catch((error: unknown) => {
            console.warn("Could not load book names for Discover", error);
          }),
      ]);
      if (!chapterReferences) {
        return [];
      }

      const bookNames = buildBookNames(context.bibleData, translationId);
      const labelOf = (reference: CrossReference) =>
        formatReference(
          reference,
          bookNames.get(reference.book) ?? reference.book
        );

      return chapterReferences.references.flatMap(
        ({ verse, references }): DiscoverResult[] => {
          const ranked = selectTopReferences(references, references.length);
          if (ranked.length === 0) {
            return [];
          }

          const title = labelOf({ book, chapter, verse });

          return [
            {
              type: "content",
              contentType: REFERENCES_CONTENT_TYPE,
              verses: [verse],
              title,
              description: "",
              reference: { book, chapter, verse },
              content: (
                <ReferenceDiscoverCard
                  // Discover keys its list items by position, so without a key
                  // of its own one verse's card would inherit another's open
                  // state when the selection or chapter changes.
                  key={`${translationId}.${book}.${chapter}.${verse}`}
                  title={title}
                  references={ranked}
                  labelOf={labelOf}
                  translationId={translationId}
                  dataManager={context.bibleData}
                  onGo={(reference) =>
                    void context.app.openVerseReference({
                      book: reference.book as BookId,
                      chapter: reference.chapter,
                      verse: reference.verse,
                      endVerse: reference.endVerse,
                    })
                  }
                  onOpenPane={() =>
                    openReferencePane({
                      seedBibleState: context,
                      currentPane,
                      translationId,
                      references,
                      title,
                      // Left unset on desktop so an open pane keeps the
                      // placement the reader gave it (floating or docked).
                      placement: context.app.isMobile.value
                        ? "fullscreen"
                        : undefined,
                    })
                  }
                />
              ),
            },
          ];
        }
      );
    },
  };
}

/**
 * One verse's cross-references, laid out like Discover's other study cards.
 *
 * Closed, it's the verse, how many references it has, and chips for the
 * strongest of them. Tapping a chip opens the card quoting that reference;
 * only "Go to verse" navigates.
 */
function ReferenceDiscoverCard(props: {
  title: string;
  /** Strongest first. */
  references: CrossReference[];
  labelOf: (reference: CrossReference) => string;
  translationId: string;
  dataManager: BibleDataManager;
  onGo: (reference: CrossReference) => void;
  onOpenPane: () => void;
}) {
  const {
    title,
    references,
    labelOf,
    translationId,
    dataManager,
    onGo,
    onOpenPane,
  } = props;
  const { t } = useI18n("ext_references");
  const isExpanded = useSignal(false);
  /** The reference the quote shows; null means the strongest one. */
  const selectedKey = useSignal<string | null>(null);
  const toggle = () => {
    isExpanded.value = !isExpanded.value;
  };

  const shown = references.slice(0, CHIP_LIMIT);
  const hiddenCount = references.length - shown.length;
  const selected =
    shown.find((reference) => referenceKey(reference) === selectedKey.value) ??
    shown[0] ??
    null;

  return (
    <div
      className={`sb-references-card${isExpanded.value ? " sb-references-card--expanded" : ""}`}
    >
      {/* The whole header toggles on click as a convenience; the chevron is
          the real toggle for keyboard and screen readers, and the title
          opens the verse in the references pane instead. */}
      <div className="sb-references-card-header" onClick={toggle}>
        <span className="sb-references-card-title">
          <button
            type="button"
            className="sb-references-card-name"
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              onOpenPane();
            }}
            title={t("open-references-pane", {
              defaultValue: "Open in the references pane",
            })}
          >
            {title}
          </button>
          <span className="sb-references-card-count">
            {t("cross-reference-count", {
              count: references.length,
              defaultValue: "{{count}} cross-references",
            })}
          </span>
        </span>
        <button
          type="button"
          className="sb-references-card-chevron"
          aria-expanded={isExpanded.value}
          aria-label={
            selected
              ? t("show-reference-text", {
                  reference: labelOf(selected),
                  defaultValue: "Show the text of {{reference}}",
                })
              : undefined
          }
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            toggle();
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {isExpanded.value ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>

      <div className="sb-references-card-chips">
        {shown.map((reference) => {
          const key = referenceKey(reference);
          const isActive =
            isExpanded.value &&
            selected !== null &&
            key === referenceKey(selected);
          return (
            <button
              key={key}
              type="button"
              className={`sb-references-chip${isActive ? " sb-references-chip--active" : ""}`}
              aria-pressed={isExpanded.value ? isActive : undefined}
              onClick={() => {
                selectedKey.value = key;
                isExpanded.value = true;
              }}
            >
              {labelOf(reference)}
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <button
            type="button"
            className="sb-references-chip sb-references-chip--more"
            onClick={onOpenPane}
            title={t("show-all-references", {
              count: references.length,
              defaultValue: "Show all {{count}} references",
            })}
          >
            {t("more-references", {
              count: hiddenCount,
              defaultValue: "+{{count}} more",
            })}
          </button>
        )}
      </div>

      {isExpanded.value && selected && (
        <ReferenceQuote
          // Remounts per reference, so each one loads its own text.
          key={referenceKey(selected)}
          reference={selected}
          label={labelOf(selected)}
          translationId={translationId}
          dataManager={dataManager}
          onGo={() => onGo(selected)}
        />
      )}
    </div>
  );
}

/** The chosen reference, quoted in the reader's translation. */
function ReferenceQuote(props: {
  reference: CrossReference;
  label: string;
  translationId: string;
  dataManager: BibleDataManager;
  onGo: () => void;
}) {
  const { reference, label, translationId, dataManager, onGo } = props;
  const { t } = useI18n("ext_references");
  const text = useSignal<ReferenceText>({ status: "loading" });
  const translation = useSignal<string | null>(null);

  useEffect(() => {
    let active = true;
    text.value = { status: "loading" };
    loadReferencePassage({ reference, dataManager, translationId })
      .then((passage) => {
        if (active) {
          translation.value = passage.translation;
          text.value =
            passage.verses.length > 0
              ? { status: "ready", verses: passage.verses }
              : { status: "unavailable" };
        }
      })
      .catch((error: unknown) => {
        console.warn("Could not load the text for this reference", error);
        if (active) {
          text.value = { status: "unavailable" };
        }
      });
    return () => {
      active = false;
    };
  }, [translationId, dataManager]);

  return (
    <figure className="sb-references-quote">
      <ReferenceBody text={text.value} className="sb-references-quote-text" />
      <figcaption className="sb-references-quote-footer">
        <span className="sb-references-quote-ref">
          {text.value.status === "ready" && translation.value
            ? `${label} · ${translation.value}`
            : label}
        </span>
        <button type="button" className="sb-references-quote-go" onClick={onGo}>
          {t("go-to-verse", { defaultValue: "Go to verse" })}
        </button>
      </figcaption>
    </figure>
  );
}
