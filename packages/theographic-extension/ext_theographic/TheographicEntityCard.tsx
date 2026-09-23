import "./TheographicEntityCard.css";
import { useSignal, type ReadonlySignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { useI18n } from "seed-bible/i18n";
import {
  MaterialIcon,
  Skeleton,
  SkeletonContainer,
} from "seed-bible/components";
import type {
  BookId,
  VerseRef,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { DiscoverContentType } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import type { Dataset } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  EVENT_CONTENT_TYPE,
  PERSON_CONTENT_TYPE,
  PLACE_CONTENT_TYPE,
} from "./contentTypes";
import type {
  QuotedPassage,
  ScriptureReader,
  TheographicClient,
  TheographicEventDetail,
  TheographicEventEntry,
  TheographicPersonDetail,
  TheographicPersonEntry,
  TheographicPlaceDetail,
  TheographicPlaceEntry,
  TheographicReference,
  TheographicRelatedEntity,
} from "./provider";
import { PlaceMap, canMapPlace, type PlaceLocations } from "./map";
import { withoutQualifier } from "./names";

type TheographicEntry =
  | TheographicPersonEntry
  | TheographicPlaceEntry
  | TheographicEventEntry;

type TheographicDetail =
  | TheographicPersonDetail
  | TheographicPlaceDetail
  | TheographicEventDetail;

interface TheographicEntityCardProps {
  contentType: DiscoverContentType;
  entry: TheographicEntry;
  description: string;
  verses: readonly number[];
  book: BookId;
  chapter: number;
  dataset: Dataset;
  client: TheographicClient;
  onReferenceClick: (ref: VerseRef) => void;
  openPlace?: (entry: TheographicPlaceEntry) => void;
  /** Whether a place's map is currently open in its floating pane. */
  isPlaceOpen?: (entry: TheographicPlaceEntry) => boolean;
  /**
   * Whether the reader is on a phone-sized screen, where the map isn't offered
   * in a pane: panes there take the whole screen, over the card that opened it.
   */
  isMobile?: ReadonlySignal<boolean>;
  /** The locations extension's lookup, for places it has a map file for. */
  locations?: PlaceLocations;
  /** Book names and verse text in the reader's translation. */
  scripture?: ScriptureReader;
}

/** A run of consecutive verses, shown as a single chip. */
export interface VerseRange {
  start: number;
  end: number;
}

/**
 * Collapses consecutive verses into ranges.
 *
 * The chapter listing flattens each reference into every verse it spans, so an
 * event covering Genesis 3:1-24 arrives as twenty-four separate numbers. One
 * chip each turns the card into a wall of digits; "1-24" says the same thing
 * and matches how the source data records it.
 */
export function groupVerseRanges(verses: readonly number[]): VerseRange[] {
  const ascending = [...new Set(verses)].sort((a, b) => a - b);
  const ranges: VerseRange[] = [];

  for (const verse of ascending) {
    const open = ranges[ranges.length - 1];
    if (open && verse === open.end + 1) {
      open.end = verse;
    } else {
      ranges.push({ start: verse, end: verse });
    }
  }

  return ranges;
}

/** The chapter's own verses as passages, one per run: 10:8, 10:9, 3:1-24. */
export function chapterReferences(
  book: string,
  chapter: number,
  verses: readonly number[]
): TheographicReference[] {
  return groupVerseRanges(verses).map(({ start, end }) => ({
    book,
    chapter,
    verse: start,
    ...(end === start ? {} : { endVerse: end }),
  }));
}

/** "10:8", or "10:8-9" for a passage spanning verses. */
export function formatVerseSpan(reference: TheographicReference): string {
  const { chapter, verse, endVerse } = reference;
  return endVerse != null && endVerse !== verse
    ? `${chapter}:${verse}-${endVerse}`
    : `${chapter}:${verse}`;
}

function referenceKey(reference: TheographicReference): string {
  return `${reference.book} ${formatVerseSpan(reference)}`;
}

function toVerseRef(reference: TheographicReference): VerseRef {
  return {
    book: reference.book as BookId,
    chapter: reference.chapter,
    verse: reference.verse,
    ...(reference.endVerse != null && reference.endVerse !== reference.verse
      ? { endVerse: reference.endVerse }
      : {}),
  };
}

/**
 * Splits `text` around every whole-word occurrence of `name`, so the quote
 * can mark where the entity is named. The trailing disambiguator Theographic
 * adds ("Jacob (Israel)") is dropped first, since it never appears in the text.
 */
export function highlightName(
  text: string,
  name: string
): { text: string; match: boolean }[] {
  const needle = withoutQualifier(name);
  if (!needle) {
    return [{ text, match: false }];
  }
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "giu"
  );

  const parts: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const found of text.matchAll(pattern)) {
    const index = found.index ?? 0;
    if (index > last) {
      parts.push({ text: text.slice(last, index), match: false });
    }
    parts.push({ text: found[0], match: true });
    last = index + found[0].length;
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), match: false });
  }
  return parts;
}

/** What the expanded half of the card is currently showing. */
type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; detail: TheographicDetail }
  | { status: "error" };

function detailReferences(detail: TheographicDetail): TheographicReference[] {
  if ("person" in detail) return detail.person.references ?? [];
  if ("place" in detail) return detail.place.references ?? [];
  return detail.event.references ?? [];
}

/**
 * One person, place or event named in the chapter being read.
 *
 * Collapsed it is the name, what kind of thing it is, and the verses of this
 * chapter it appears in — tapping one of those jumps straight to it. Expanded,
 * it fetches the entity's own record and becomes a study card: every mention
 * across the Bible to choose from, the chosen verse quoted with the name
 * marked, the facts, a map for a place, and the full dictionary entry.
 */
export function TheographicEntityCard(props: TheographicEntityCardProps) {
  const {
    contentType,
    entry,
    verses,
    book,
    chapter,
    dataset,
    client,
    openPlace,
    isPlaceOpen,
    isMobile,
    locations,
    scripture,
  } = props;
  const { t } = useI18n("theographic-extension");
  const placeTypeLabel = usePlaceTypeLabel();

  const place =
    contentType === PLACE_CONTENT_TYPE
      ? (entry as TheographicPlaceEntry)
      : null;
  // A place can be drawn from the locations extension's file even when the
  // dataset has no coordinates for it.
  const isMappable = place != null && canMapPlace(place, locations);

  const isExpanded = useSignal(false);
  const detail = useSignal<DetailState>({ status: "idle" });
  /** The mention the quote shows; null means the first one in this chapter. */
  const selectedKey = useSignal<string | null>(null);

  async function loadDetail() {
    detail.value = { status: "loading" };
    try {
      const loaded = await client.getEntity<TheographicDetail>(entry.apiLink);
      detail.value = { status: "loaded", detail: loaded };
    } catch {
      detail.value = { status: "error" };
    }
  }

  function toggle() {
    isExpanded.value = !isExpanded.value;
    if (
      isExpanded.value &&
      (detail.value.status === "idle" || detail.value.status === "error")
    ) {
      void loadDetail();
    }
  }

  // The chapter listing only has a place's broad type ("Water"); its record,
  // fetched on expanding, has the sub type ("River") where there is one.
  const placeType =
    (detail.value.status === "loaded" && "place" in detail.value.detail
      ? detail.value.detail.place.featureSubType
      : undefined) ?? place?.featureType;
  const kind =
    contentType === PERSON_CONTENT_TYPE
      ? t("person", { defaultValue: "Person" })
      : contentType === EVENT_CONTENT_TYPE
        ? t("event", { defaultValue: "Event" })
        : placeType
          ? placeTypeLabel(placeType)
          : t("place", { defaultValue: "Place" });

  const bookName = (bookId: string) => scripture?.bookName(bookId) ?? bookId;

  const inChapter = chapterReferences(book, chapter, verses);
  const references =
    detail.value.status === "loaded"
      ? detailReferences(detail.value.detail)
      : [];
  const selected =
    inChapter.find(
      (reference) => referenceKey(reference) === selectedKey.value
    ) ??
    inChapter[0] ??
    null;

  const chip = (reference: TheographicReference, label: string) => {
    const isActive =
      isExpanded.value &&
      selected != null &&
      referenceKey(reference) === referenceKey(selected);
    return (
      <button
        key={referenceKey(reference)}
        type="button"
        className={`sb-theographic-verse-chip${isActive ? " sb-theographic-verse-chip--active" : ""}`}
        aria-pressed={isExpanded.value ? isActive : undefined}
        onClick={() => {
          // Collapsed, a chip is a shortcut to the verse. Expanded, the chips
          // choose which mention to quote, and "Go to verse" navigates.
          if (isExpanded.value) {
            selectedKey.value = referenceKey(reference);
          } else {
            props.onReferenceClick(toVerseRef(reference));
          }
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className={`sb-theographic-card${isExpanded.value ? " sb-theographic-card--expanded" : ""}`}
    >
      <button
        type="button"
        className="sb-theographic-card-header"
        aria-expanded={isExpanded.value}
        onClick={toggle}
      >
        <span className="sb-theographic-card-title">
          <span className="sb-theographic-card-name">{entry.name}</span>
          <span className="sb-theographic-card-kind">{kind}</span>
        </span>
        <MaterialIcon className="sb-theographic-card-chevron">
          {isExpanded.value ? "expand_less" : "expand_more"}
        </MaterialIcon>
      </button>

      <div className="sb-theographic-card-verses">
        {inChapter.map((reference) =>
          chip(reference, formatVerseSpan(reference))
        )}
      </div>

      {isExpanded.value && (
        <div className="sb-theographic-card-detail">
          {selected && scripture ? (
            <VersePreview
              // Remounts per mention, so each one loads its own verse.
              key={referenceKey(selected)}
              reference={selected}
              name={entry.name}
              scripture={scripture}
              onGo={() => props.onReferenceClick(toVerseRef(selected))}
            />
          ) : null}

          {detail.value.status === "loading" && (
            <SkeletonContainer
              label={t("loading", { defaultValue: "Loading…" })}
              className="sb-theographic-card-loading"
            >
              <Skeleton shape="line" width="45%" />
              <Skeleton shape="line" width="38%" />
              <Skeleton
                shape="line"
                width="100%"
                className="sb-theographic-card-loading-fact"
              />
              <Skeleton shape="line" width="94%" />
              <Skeleton shape="line" width="86%" />
              <Skeleton shape="line" width="62%" />
            </SkeletonContainer>
          )}
          {detail.value.status === "error" && (
            <button
              type="button"
              className="sb-theographic-card-retry"
              onClick={() => void loadDetail()}
            >
              {t("detail-failed", {
                defaultValue: "Couldn't load details. Try again.",
              })}
            </button>
          )}
          {detail.value.status === "loaded" && (
            <DetailBody
              contentType={contentType}
              detail={detail.value.detail}
              references={references}
              bookName={bookName}
              map={
                // While the floating pane has this place's map, the card
                // doesn't show a second copy; closing the pane brings it back.
                place && isMappable && !isPlaceOpen?.(place) ? (
                  <PlaceMap
                    place={place}
                    sources={{ client, locations }}
                    label={t("map-of", {
                      place: place.name,
                      defaultValue: "Map of {{place}}",
                    })}
                    onOpen={
                      openPlace && !isMobile?.value
                        ? () => openPlace(place)
                        : undefined
                    }
                    openLabel={t("open-in-map", {
                      defaultValue: "Open in map",
                    })}
                  />
                ) : null
              }
            />
          )}
          <Attribution dataset={dataset} />
        </div>
      )}
    </div>
  );
}

/** The chosen mention, quoted in the reader's translation with the name marked. */
function VersePreview(props: {
  reference: TheographicReference;
  name: string;
  scripture: ScriptureReader;
  onGo: () => void;
}) {
  const { reference, name, scripture, onGo } = props;
  const { t } = useI18n("theographic-extension");
  const passage = useSignal<QuotedPassage | null | "loading">("loading");

  // Remounted per mention (see its `key`), so only a new reader — the tab
  // switching translation — has to reload it.
  useEffect(() => {
    let isCurrent = true;
    passage.value = "loading";
    void scripture.readPassage(reference).then((loaded) => {
      if (isCurrent) {
        passage.value = loaded;
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [scripture]);

  const label = `${scripture.bookName(reference.book)} ${formatVerseSpan(reference)}`;
  const loaded = passage.value !== "loading" ? passage.value : null;

  return (
    <figure className="sb-theographic-quote">
      {passage.value === "loading" ? (
        <SkeletonContainer label={t("loading", { defaultValue: "Loading…" })}>
          <Skeleton shape="line" width="100%" />
          <Skeleton shape="line" width="72%" />
        </SkeletonContainer>
      ) : loaded ? (
        <q className="sb-theographic-quote-text">
          {highlightName(loaded.text, name).map((part, index) =>
            part.match ? (
              <mark key={index} className="sb-theographic-quote-mark">
                {part.text}
              </mark>
            ) : (
              part.text
            )
          )}
        </q>
      ) : (
        <p className="sb-theographic-card-hint">
          {t("verse-unavailable", {
            defaultValue: "This verse couldn't be loaded.",
          })}
        </p>
      )}
      <figcaption className="sb-theographic-quote-footer">
        <span className="sb-theographic-quote-ref">
          {loaded ? `${label} · ${loaded.translation}` : label}
        </span>
        <button
          type="button"
          className="sb-theographic-quote-go"
          onClick={onGo}
        >
          {t("go-to-verse", { defaultValue: "Go to verse" })}
        </button>
      </figcaption>
    </figure>
  );
}

function DetailBody(props: {
  contentType: DiscoverContentType;
  detail: TheographicDetail;
  references: readonly TheographicReference[];
  bookName: (bookId: string) => string;
  map: ComponentChildren;
}) {
  const { contentType, detail, references, bookName, map } = props;
  const mentioned = (
    <MentionedFact references={references} bookName={bookName} />
  );

  if (contentType === PERSON_CONTENT_TYPE && "person" in detail) {
    return <PersonDetail person={detail.person} mentioned={mentioned} />;
  }
  if (contentType === PLACE_CONTENT_TYPE && "place" in detail) {
    return <PlaceDetail place={detail.place} mentioned={mentioned} map={map} />;
  }
  if (contentType === EVENT_CONTENT_TYPE && "event" in detail) {
    return <EventDetail event={detail.event} mentioned={mentioned} />;
  }
  return null;
}

function PersonDetail(props: {
  person: TheographicPersonDetail["person"];
  mentioned: ComponentChildren;
}) {
  const { person, mentioned } = props;
  const { t } = useI18n("theographic-extension");
  const formatYear = (year?: number): string | null => {
    if (year == null) {
      return null;
    }
    // Theographic years are signed, with negatives meaning BC.
    return year < 0
      ? t("year-bc", { year: Math.abs(year), defaultValue: "{{year}} BC" })
      : t("year-ad", { year, defaultValue: "{{year}} AD" });
  };

  return (
    <>
      <dl className="sb-theographic-facts">
        <Fact
          label={t("born", { defaultValue: "Born" })}
          value={formatYear(person.birthYear)}
        />
        <Fact
          label={t("died", { defaultValue: "Died" })}
          value={formatYear(person.deathYear)}
        />
        <Fact
          label={t("birthplace", { defaultValue: "Birthplace" })}
          value={person.birthPlace?.name}
        />
        <RelatedFact
          label={t("father", { defaultValue: "Father" })}
          entities={person.father}
        />
        <RelatedFact
          label={t("mother", { defaultValue: "Mother" })}
          entities={person.mother}
        />
        <RelatedFact
          label={t("partners", { defaultValue: "Partners" })}
          entities={person.partners}
        />
        <RelatedFact
          label={t("children", { defaultValue: "Children" })}
          entities={person.children}
        />
        <RelatedFact
          label={t("siblings", { defaultValue: "Siblings" })}
          entities={person.siblings}
        />
        <RelatedFact
          label={t("member-of", { defaultValue: "Member of" })}
          entities={person.memberOf}
        />
        <RelatedFact
          label={t("related-events", { defaultValue: "Events" })}
          entities={person.events}
        />
        {mentioned}
      </dl>
      <FullEntry paragraphs={person.description} />
    </>
  );
}

function PlaceDetail(props: {
  place: TheographicPlaceDetail["place"];
  mentioned: ComponentChildren;
  map: ComponentChildren;
}) {
  const { place, mentioned, map } = props;
  const { t } = useI18n("theographic-extension");
  const placeTypeLabel = usePlaceTypeLabel();

  return (
    <>
      <dl className="sb-theographic-facts">
        <Fact
          label={t("also-known-as", { defaultValue: "Also known as" })}
          value={alternateNames(place)}
        />
        <Fact
          label={t("place-type", { defaultValue: "Type" })}
          value={
            place.featureSubType ? placeTypeLabel(place.featureSubType) : null
          }
        />
        <Fact
          label={t("today", { defaultValue: "Today" })}
          value={place.comment}
        />
        {mentioned}
      </dl>
      {map}
      <FullEntry paragraphs={place.description} />
    </>
  );
}

function EventDetail(props: {
  event: TheographicEventDetail["event"];
  mentioned: ComponentChildren;
}) {
  const { event, mentioned } = props;
  const { t } = useI18n("theographic-extension");

  return (
    <>
      <dl className="sb-theographic-facts">
        <Fact
          label={t("start-date", { defaultValue: "Date" })}
          value={event.startDate}
        />
        <Fact
          label={t("duration", { defaultValue: "Duration" })}
          value={event.duration}
        />
        <RelatedFact
          label={t("participants", { defaultValue: "Participants" })}
          entities={event.participants}
        />
        <RelatedFact
          label={t("locations", { defaultValue: "Locations" })}
          entities={event.locations}
        />
        {mentioned}
      </dl>
      <FullEntry paragraphs={event.description} />
    </>
  );
}

/**
 * "4 passages · Genesis, Ezra" — how widely the entity is mentioned. A
 * reference can span verses ("Genesis 3:1-24"), so what's counted is
 * passages, not individual mentions. Book names past the first three collapse
 * to a count, or Aaron's 16 books would wrap across several lines.
 */
function MentionedFact(props: {
  references: readonly TheographicReference[];
  bookName: (bookId: string) => string;
}) {
  const { references, bookName } = props;
  const { t } = useI18n("theographic-extension");
  if (references.length === 0) {
    return null;
  }

  const books = [...new Set(references.map((reference) => reference.book))];
  const named = books.slice(0, 3).map(bookName).join(", ");
  const rest = books.length - 3;

  return (
    <Fact
      label={t("mentioned", { defaultValue: "Mentioned" })}
      value={`${t("passage-count", {
        count: references.length,
        defaultValue: "{{count}} passages",
      })} · ${rest > 0 ? `${named} +${rest}` : named}`}
    />
  );
}

function FullEntry(props: { paragraphs?: string[] }) {
  const { t } = useI18n("theographic-extension");
  if (!props.paragraphs || props.paragraphs.length === 0) {
    return null;
  }
  return (
    <section className="sb-theographic-full-entry">
      <h4 className="sb-theographic-section-label">
        {t("full-entry", { defaultValue: "Full entry" })}
      </h4>
      <div className="sb-theographic-card-description">
        {props.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

function Fact(props: { label: string; value?: string | null }) {
  if (!props.value) {
    return null;
  }
  return (
    <div className="sb-theographic-fact">
      <dt>{props.label}</dt>
      <dd>{props.value}</dd>
    </div>
  );
}

function RelatedFact(props: {
  label: string;
  entities?: TheographicRelatedEntity[];
}) {
  if (!props.entities || props.entities.length === 0) {
    return null;
  }
  return (
    <Fact
      label={props.label}
      value={props.entities.map((entity) => entity.name).join(", ")}
    />
  );
}

function Attribution(props: { dataset: Dataset }) {
  const { dataset } = props;
  const { t } = useI18n("theographic-extension");

  return (
    <p className="sb-theographic-attribution">
      {dataset.licenseUrl ? (
        <a href={dataset.licenseUrl} target="_blank" rel="noreferrer noopener">
          {t("attribution", {
            defaultValue: "Theographic Bible Metadata · CC BY-SA 4.0",
          })}
        </a>
      ) : (
        t("attribution", {
          defaultValue: "Theographic Bible Metadata · CC BY-SA 4.0",
        })
      )}
    </p>
  );
}

function alternateNames(place: TheographicPlaceDetail["place"]): string | null {
  const names = [place.kjvName, place.esvName].filter(
    (name): name is string => !!name && name !== place.name
  );
  return names.length > 0 ? Array.from(new Set(names)).join(", ") : null;
}

/**
 * Names a place's type or sub type in the reader's language. These are the
 * only values the dataset uses; anything new is shown as the dataset spells it.
 */
function usePlaceTypeLabel(): (type: string) => string {
  const { t } = useI18n("theographic-extension");
  return (type) => {
    switch (type) {
      case "City":
        return t("place-type-city", { defaultValue: "City" });
      case "Region":
        return t("place-type-region", { defaultValue: "Region" });
      case "Water":
        return t("place-type-water", { defaultValue: "Water" });
      case "Landmark":
        return t("place-type-landmark", { defaultValue: "Landmark" });
      case "Mountain":
        return t("place-type-mountain", { defaultValue: "Mountain" });
      case "Valley":
        return t("place-type-valley", { defaultValue: "Valley" });
      case "Island":
        return t("place-type-island", { defaultValue: "Island" });
      case "Path":
        return t("place-type-path", { defaultValue: "Path" });
      case "River":
        return t("place-type-river", { defaultValue: "River" });
      case "Gate":
        return t("place-type-gate", { defaultValue: "Gate" });
      case "Country":
        return t("place-type-country", { defaultValue: "Country" });
      case "Spring":
        return t("place-type-spring", { defaultValue: "Spring" });
      case "Well":
        return t("place-type-well", { defaultValue: "Well" });
      case "Garden":
        return t("place-type-garden", { defaultValue: "Garden" });
      case "Cave":
        return t("place-type-cave", { defaultValue: "Cave" });
      case "Tower":
        return t("place-type-tower", { defaultValue: "Tower" });
      default:
        return type;
    }
  };
}
