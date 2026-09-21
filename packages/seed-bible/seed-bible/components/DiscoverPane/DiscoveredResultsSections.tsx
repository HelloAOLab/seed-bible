import "./DiscoverPane.css";
import { useI18n } from "../../i18n/I18nManager";
import type { ReaderTab } from "../../managers/TabsManager";
import type {
  DiscoverContentResult,
  DiscoverReference,
} from "../../managers/DiscoverManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { ExpandableText } from "../ExpandableText/ExpandableText";
import { DiscoverSection, DiscoverEmpty } from "./DiscoverSection";

type ReferenceWithBookData = DiscoverReference & { bookData: TranslationBook };

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
  const results = groups.flatMap((group) => group.results);

  if (results.length <= 0) {
    return null; // Don't show the section at all if there are no results, since this is a "discover" feature and we don't want to show empty sections for chapters that have no cross references.
  }

  const resultsByAuthor = new Map<string, DiscoverContentResult[]>();
  const authorlessResults: DiscoverContentResult[] = [];
  for (const result of results) {
    if (result.author) {
      const existing = resultsByAuthor.get(result.author);
      if (existing) {
        existing.push(result);
      } else {
        resultsByAuthor.set(result.author, [result]);
      }
    } else {
      authorlessResults.push(result);
    }
  }

  return (
    <>
      {[...resultsByAuthor.entries()].map(([author, authorResults]) => (
        <DiscoverSection key={author} title={author}>
          <ContentResultsList results={authorResults} />
        </DiscoverSection>
      ))}
      {authorlessResults.length > 0 ? (
        <DiscoverSection title={title}>
          <ContentResultsList results={authorlessResults} />
        </DiscoverSection>
      ) : null}
    </>
  );
}

function ContentResultsList(props: { results: DiscoverContentResult[] }) {
  const { t } = useI18n();

  return (
    <ul className="sb-discover-list">
      {props.results.map((result, index) => (
        <li
          key={index}
          className={`sb-discover-item${result.onClick ? " sb-discover-item--clickable" : ""}`}
          onClick={result.onClick}
        >
          {result.image ? (
            <img className="sb-discover-item-image" src={result.image} alt="" />
          ) : null}
          <span className="sb-discover-item-title">{result.title}</span>
          {result.description ? (
            <ExpandableText
              className="sb-discover-item-description"
              readMoreLabel={t("read-more", { defaultValue: "Read more" })}
              readLessLabel={t("read-less", { defaultValue: "Read less" })}
            >
              {result.description}
            </ExpandableText>
          ) : null}
          {result.content ? (
            <div className="sb-discover-item-content">{result.content}</div>
          ) : null}
        </li>
      ))}
    </ul>
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
