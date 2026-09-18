import "./DiscoverPane.css";
import { useI18n } from "../../i18n/I18nManager";
import type { ReaderTab } from "../../managers/TabsManager";
import {
  DISCOVER_CONTENT_TYPES_HIDDEN_BY_DEFAULT,
  type DiscoverContentType,
  type DiscoverReference,
} from "../../managers/DiscoverManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { DiscoverSection, DiscoverEmpty } from "./DiscoverSection";

type ReferenceWithBookData = DiscoverReference & { bookData: TranslationBook };

/** A discovered content result once the reading state has attached book data. */
type ContentResult =
  ReaderTab["readingState"]["discoveredContent"]["value"][number]["results"][number];

/**
 * The chapter's results for one Theographic type, narrowed to the reader's
 * verse selection when there is one.
 *
 * Shared by the compact panel and the full pane so the two can't disagree
 * about what "in this verse" means. With nothing selected the whole chapter is
 * returned, so the lists still read as a chapter overview.
 *
 * Only *which* entries are listed narrows. Each surviving card still shows
 * every verse of the chapter its subject appears in, so a reader on Exodus 4:14
 * sees Aaron listed and can tell at a glance that he returns at 27-30.
 */
export function theographicResultsFor(
  tab: ReaderTab,
  contentType: DiscoverContentType
): ContentResult[] {
  const results = tab.readingState.discoveredContent.value
    .flatMap((group) => group.results)
    .filter((result) => result.contentType === contentType);

  const selected = new Set(
    tab.readingState.selectedVerses.value.map((item) => item.verse.number)
  );
  if (selected.size === 0) {
    return results;
  }

  return results.filter((result) =>
    (result.verses ?? []).some((verse) => selected.has(verse))
  );
}

/** Whether any of the three Theographic types has something to show. */
export function hasTheographicResults(tab: ReaderTab): boolean {
  return DISCOVER_CONTENT_TYPES_HIDDEN_BY_DEFAULT.some(
    (contentType) => theographicResultsFor(tab, contentType).length > 0
  );
}

export function CrossReferencesSection(props: { tab: ReaderTab | null }) {
  const { tab } = props;
  const { t } = useI18n();
  const title = t("cross-references", { defaultValue: "Cross references" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const groups = tab.readingState.discoveredCrossReferences.value;
  const results = groups.flatMap((group) => group.results);

  if (results.length <= 0) {
    return null; // Don't show the section at all if there are no results, since this is a "discover" feature and we don't want to show empty sections for chapters that have no cross references.
  }

  return (
    <DiscoverSection title={title}>
      {results.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-cross-references-empty", {
            defaultValue: "No cross references for this chapter.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {results.map((result, index) => (
            <li key={index} className="sb-discover-item">
              <span className="sb-discover-item-title">
                {formatRef(result.crossReference)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

export function StudyNotesSection(props: { tab: ReaderTab | null }) {
  const { tab } = props;
  const { t } = useI18n();
  const title = t("study-notes", { defaultValue: "Study notes" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const groups = tab.readingState.discoveredStudyNotes.value;
  const results = groups.flatMap((group) => group.results);

  if (results.length <= 0) {
    return null; // Don't show the section at all if there are no results, since this is a "discover" feature and we don't want to show empty sections for chapters that have no cross references.
  }

  return (
    <DiscoverSection title={title}>
      {results.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-study-notes-empty", {
            defaultValue: "No study notes for this chapter.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {results.map((result, index) => (
            <li key={index} className="sb-discover-item">
              <span className="sb-discover-item-title">
                {formatRef(result.reference)}
              </span>
              <div className="sb-discover-item-content">{result.content}</div>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

export function ContentSection(props: { tab: ReaderTab | null }) {
  const { tab } = props;
  const { t } = useI18n();
  const title = t("content", { defaultValue: "Content" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const groups = tab.readingState.discoveredContent.value;
  const results = groups
    .flatMap((group) => group.results)
    .filter(
      (result) =>
        !result.contentType ||
        !DISCOVER_CONTENT_TYPES_HIDDEN_BY_DEFAULT.includes(result.contentType)
    );

  if (results.length <= 0) {
    return null;
  }

  return (
    <DiscoverSection title={title}>
      {results.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-content-empty", {
            defaultValue: "No content for this chapter.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {results.map((result, index) => (
            <li key={index} className="sb-discover-item">
              <span className="sb-discover-item-title">{result.title}</span>
              {result.description ? (
                <span className="sb-discover-item-description">
                  {result.description}
                </span>
              ) : null}
              <div className="sb-discover-item-content">{result.content}</div>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

/**
 * One Theographic type's entries for the chapter.
 *
 * The card in `result.content` renders the whole entry — name, subtitle, verse
 * links and the expandable detail — so unlike {@link ContentSection} this
 * doesn't also print the title and description above it.
 */
function TheographicSection(props: {
  tab: ReaderTab | null;
  contentType: DiscoverContentType;
  title: string;
  collapsible?: boolean;
}) {
  const { tab, contentType, title, collapsible } = props;

  if (!tab) {
    return null;
  }

  const results = theographicResultsFor(tab, contentType);
  if (results.length === 0) {
    return null;
  }

  return (
    <DiscoverSection
      title={title}
      count={results.length}
      collapsible={collapsible}
      defaultCollapsed={collapsible}
    >
      <ul className="sb-discover-list">
        {results.map((result, index) => (
          <li key={index} className="sb-discover-item">
            {result.content}
          </li>
        ))}
      </ul>
    </DiscoverSection>
  );
}

export function PeopleSection(props: {
  tab: ReaderTab | null;
  collapsible?: boolean;
}) {
  const { t } = useI18n();
  return (
    <TheographicSection
      tab={props.tab}
      contentType="person_profile"
      title={t("people", { defaultValue: "People" })}
      collapsible={props.collapsible}
    />
  );
}

export function PlacesSection(props: {
  tab: ReaderTab | null;
  collapsible?: boolean;
}) {
  const { t } = useI18n();
  return (
    <TheographicSection
      tab={props.tab}
      contentType="place_profile"
      title={t("places", { defaultValue: "Places" })}
      collapsible={props.collapsible}
    />
  );
}

export function EventsSection(props: {
  tab: ReaderTab | null;
  collapsible?: boolean;
}) {
  const { t } = useI18n();
  return (
    <TheographicSection
      tab={props.tab}
      contentType="event"
      title={t("events", { defaultValue: "Events" })}
      collapsible={props.collapsible}
    />
  );
}

export function noTabHint(t: ReturnType<typeof useI18n>["t"]) {
  return (
    <DiscoverEmpty
      text={t("discover-select-tab", {
        defaultValue: "Select a tab to discover related material.",
      })}
    />
  );
}

/** Formats a discovered reference into a human-readable label (e.g. "Genesis 1:1"). */
function formatRef(ref: ReferenceWithBookData): string {
  const book = ref.bookData.commonName ?? ref.bookData.name;
  let label = `${book} ${ref.chapter}`;
  if (ref.verse != null) {
    label += `:${ref.verse}`;
    if (ref.endVerse != null) {
      label += `-${ref.endVerse}`;
    }
  }
  return label;
}
