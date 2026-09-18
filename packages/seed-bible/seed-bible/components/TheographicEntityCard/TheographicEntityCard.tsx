import "./TheographicEntityCard.css";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import { MaterialIcon } from "../icons";
import { Skeleton, SkeletonContainer } from "../Skeleton/Skeleton";
import type { BookId, VerseRef } from "../../managers/BibleDataManager";
import type { DiscoverContentType } from "../../managers/DiscoverManager";
import type { Dataset } from "../../managers/FreeUseBibleAPI";
import type {
  TheographicClient,
  TheographicEventDetail,
  TheographicEventEntry,
  TheographicPersonDetail,
  TheographicPersonEntry,
  TheographicPlaceDetail,
  TheographicPlaceEntry,
  TheographicRelatedEntity,
} from "../../managers/TheographicDiscoverProvider";

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

/** What the expanded half of the card is currently showing. */
type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; detail: TheographicDetail }
  | { status: "error" };

/**
 * One person, place or event named in the chapter being read.
 *
 * Collapsed it is a name, a short subtitle and the verses it appears in.
 * Expanding fetches that entity's own record — which the chapter listing does
 * not include — and shows its description and relationships.
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
  } = props;

  // Only a place can go on a map, and only one the dataset has a position for.
  const mappablePlace =
    contentType === "place_profile" && openPlace
      ? (entry as TheographicPlaceEntry)
      : null;
  const canOpenOnMap =
    mappablePlace != null &&
    typeof mappablePlace.latitude === "number" &&
    typeof mappablePlace.longitude === "number";
  const { t } = useI18n();

  const isExpanded = useSignal(false);
  const detail = useSignal<DetailState>({ status: "idle" });

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

  return (
    <div className="sb-theographic-card">
      <div className="sb-theographic-card-header-row">
        <button
          type="button"
          className="sb-theographic-card-header"
          aria-expanded={isExpanded.value}
          onClick={toggle}
        >
          <MaterialIcon className="sb-theographic-card-chevron">
            {isExpanded.value ? "expand_more" : "chevron_right"}
          </MaterialIcon>
          <span className="sb-theographic-card-name">{entry.name}</span>
        </button>

        {canOpenOnMap && mappablePlace ? (
          <button
            type="button"
            className="sb-theographic-card-open"
            title={t("show-on-map", { defaultValue: "Show on map" })}
            aria-label={t("show-on-map", { defaultValue: "Show on map" })}
            onClick={() => openPlace?.(mappablePlace)}
          >
            <MaterialIcon style={{ fontSize: "1rem" }}>map</MaterialIcon>
          </button>
        ) : null}
      </div>

      <div className="sb-theographic-card-verses">
        {groupVerseRanges(verses).map(({ start, end }) => (
          <button
            key={start}
            type="button"
            className="sb-theographic-verse-chip"
            onClick={() =>
              props.onReferenceClick({
                book,
                chapter,
                verse: start,
                ...(end === start ? {} : { endVerse: end }),
              })
            }
          >
            {start === end ? start : `${start}-${end}`}
          </button>
        ))}
      </div>

      {isExpanded.value && (
        <div className="sb-theographic-card-detail">
          {detail.value.status === "loading" && (
            <SkeletonContainer
              label={t("loading", { defaultValue: "Loading…" })}
              className="sb-theographic-card-loading"
            >
              <Skeleton shape="line" width="100%" />
              <Skeleton shape="line" width="94%" />
              <Skeleton shape="line" width="86%" />
              <Skeleton shape="line" width="62%" />
              <Skeleton
                shape="line"
                width="45%"
                className="sb-theographic-card-loading-fact"
              />
              <Skeleton shape="line" width="38%" />
            </SkeletonContainer>
          )}
          {detail.value.status === "error" && (
            <button
              type="button"
              className="sb-theographic-card-retry"
              onClick={() => void loadDetail()}
            >
              {t("theographic-detail-failed", {
                defaultValue: "Couldn't load details. Try again.",
              })}
            </button>
          )}
          {detail.value.status === "loaded" && (
            <DetailBody
              contentType={contentType}
              detail={detail.value.detail}
            />
          )}
          <Attribution dataset={dataset} />
        </div>
      )}
    </div>
  );
}

function DetailBody(props: {
  contentType: DiscoverContentType;
  detail: TheographicDetail;
}) {
  const { contentType, detail } = props;

  if (contentType === "person_profile" && "person" in detail) {
    return <PersonDetail person={detail.person} />;
  }
  if (contentType === "place_profile" && "place" in detail) {
    return <PlaceDetail place={detail.place} />;
  }
  if (contentType === "event" && "event" in detail) {
    return <EventDetail event={detail.event} />;
  }
  return null;
}

function PersonDetail(props: { person: TheographicPersonDetail["person"] }) {
  const { person } = props;
  const { t } = useI18n();

  return (
    <>
      <Description paragraphs={person.description} />
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
      </dl>
    </>
  );
}

function PlaceDetail(props: { place: TheographicPlaceDetail["place"] }) {
  const { place } = props;
  const { t } = useI18n();

  return (
    <>
      <Description paragraphs={place.description} />
      <dl className="sb-theographic-facts">
        <Fact
          label={t("place-type", { defaultValue: "Type" })}
          value={[place.featureSubType].filter(Boolean).join("")}
        />
        <Fact
          label={t("coordinates", { defaultValue: "Coordinates" })}
          value={formatCoordinates(place.latitude, place.longitude)}
        />
        <Fact
          label={t("also-called", { defaultValue: "Also called" })}
          value={alternateNames(place)}
        />
      </dl>
    </>
  );
}

function EventDetail(props: { event: TheographicEventDetail["event"] }) {
  const { event } = props;
  const { t } = useI18n();

  return (
    <>
      <Description paragraphs={event.description} />
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
      </dl>
    </>
  );
}

function Description(props: { paragraphs?: string[] }) {
  if (!props.paragraphs || props.paragraphs.length === 0) {
    return null;
  }
  return (
    <div className="sb-theographic-card-description">
      {props.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
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
  const { t } = useI18n();

  return (
    <p className="sb-theographic-attribution">
      {dataset.licenseUrl ? (
        <a href={dataset.licenseUrl} target="_blank" rel="noreferrer noopener">
          {t("theographic-attribution", {
            defaultValue: "Theographic Bible Metadata · CC BY-SA 4.0",
          })}
        </a>
      ) : (
        t("theographic-attribution", {
          defaultValue: "Theographic Bible Metadata · CC BY-SA 4.0",
        })
      )}
    </p>
  );
}

/** Theographic years are signed, with negatives meaning BC. */
function formatYear(year?: number): string | null {
  if (year == null) {
    return null;
  }
  return year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
}

function formatCoordinates(
  latitude?: number,
  longitude?: number
): string | null {
  if (latitude == null || longitude == null) {
    return null;
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function alternateNames(place: TheographicPlaceDetail["place"]): string | null {
  const names = [place.kjvName, place.esvName].filter(
    (name): name is string => !!name && name !== place.name
  );
  return names.length > 0 ? Array.from(new Set(names)).join(", ") : null;
}
