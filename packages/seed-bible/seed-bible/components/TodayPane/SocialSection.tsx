import {
  useSignal,
  useSignalEffect,
  type ReadonlySignal,
} from "@preact/signals";
import { useMemo, useEffect, useRef, useCallback } from "preact/hooks";
import { Fragment } from "preact/jsx-runtime";
import {
  SocialSectionProvider,
  useSocialSectionContext,
  type SocialSectionUserProfile,
} from "./SocialSectionContext";
import { TitledSection } from "./TitledSection";
import { Tooltip, type TooltipAnchor } from "../Tooltip/Tooltip";
import { useClickOutside } from "../useClickOutside";
import {
  useReadingHistoryTimeline,
  type TimelineTooltipContent,
} from "./useReadingHistoryTimeline";
import { MaterialIcon } from "../icons";
import { ReadingHistoryTimeline } from "../ReadingHistoryTimeline/ReadingHistoryTimeline";
import { useHorizontalScroll } from "../useHorizontalScroll";
import { useI18n } from "../../i18n";
import {
  buildTimespanOptions,
  type FilteredReading as FilteredReadingData,
  type Timespan,
  type TimespanOptionId,
} from "../../managers/TodayReadingHistory";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";
import { trimmedOrNull } from "../../managers/Utils";

const TIMESPAN_OPTION_IDS = ["twoDays", "week", "month", "all"] as const;

/** How many reader avatars a book row shows before collapsing to "+N". */
const MAX_ICONS = 7;

export const SocialSection = (props: {
  today: TodayManager;
  login: LoginManager;
  theme: ReadonlySignal<BibleTheme>;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const { getCommunityReading } = props.today;
  const { t } = useI18n();
  const userId = props.login.userId.value;
  const profile = props.login.profile.value;

  // The reader list is the signed-in user alone until subscriptions exist.
  // Derived rather than held in state: every input is already to hand during
  // render, so the effect that used to write it only made the map lag a
  // render behind its own inputs.
  const userProfileMap = useMemo(() => {
    if (!userId) return new Map<string, SocialSectionUserProfile>();
    const visual = getUserAnimalVisual(userId);
    return new Map<string, SocialSectionUserProfile>([
      [
        userId,
        {
          name:
            trimmedOrNull(profile?.name) ??
            t("anonymous", { defaultValue: "Anonymous" }),
          pictureUrl: profile?.pictureUrl,
          color: visual.color,
          icon: visual.defaultIcon,
        },
      ],
    ]);
  }, [userId, profile?.name, profile?.pictureUrl, t]);

  const initialOption = useMemo(() => buildTimespanOptions().twoDays, []);
  const year = useSignal<number>(initialOption.year);
  const timespan = useSignal<Timespan | undefined>(initialOption.timespan);
  const communityReading = useSignal<FilteredReadingData>({});

  // Stable identities, and that is load-bearing rather than tidiness: the
  // timeline hook memoises ~370 grid items against `selectDay`, so a fresh
  // function each render made that memo recompute every time. These close over
  // nothing but signals, whose own identities never change, so an empty
  // dependency list is correct.
  const selectYear = useCallback((selectedYear: number) => {
    year.value = selectedYear;
    timespan.value = undefined;
  }, []);

  const selectDay = useCallback((selectedTimespan: Timespan | undefined) => {
    timespan.value = selectedTimespan;
  }, []);

  // Reactive data fetching: fetch the community reading for the exact selected
  // period. When `timespan` is undefined ("all"), clear it — no fetch.
  useSignalEffect(() => {
    const currentTimespan = timespan.value;
    if (!currentTimespan) {
      communityReading.value = {};
      return;
    }

    let cancelled = false;
    void getCommunityReading(currentTimespan).then((result) => {
      if (!cancelled) {
        communityReading.value = result;
      }
    });

    return () => {
      cancelled = true;
    };
  });

  const userFilters = useSignal<Map<string, boolean>>(new Map());

  // Keeps one filter entry per known reader as people appear and disappear,
  // without discarding the choices already made about the others. `.peek()`
  // because this reads and then writes the same signal.
  useEffect(() => {
    const next = new Map(userFilters.peek());
    for (const id of userProfileMap.keys()) {
      if (!next.has(id)) {
        next.set(id, true);
      }
    }
    for (const id of next.keys()) {
      if (!userProfileMap.has(id)) {
        next.delete(id);
      }
    }
    userFilters.value = next;
  }, [userProfileMap]);

  const toggleUserFilter = useCallback((id: string) => {
    const next = new Map(userFilters.peek());
    next.set(id, !next.get(id));
    userFilters.value = next;
  }, []);

  return (
    <SocialSectionProvider
      value={{
        userFilters: userFilters.value,
        userProfileMap,
        toggleUserFilter,
        year: year.value,
        timespan: timespan.value,
        communityReading: communityReading.value,
        selectYear,
        selectDay,
      }}
    >
      <TitledSection title={t("community", { defaultValue: "COMMUNITY" })}>
        <HistoryCard
          today={props.today}
          theme={props.theme}
          onOpenPassage={props.onOpenPassage}
        />
      </TitledSection>
    </SocialSectionProvider>
  );
};

function HistoryCard(props: {
  today: TodayManager;
  theme: ReadonlySignal<BibleTheme>;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { t, language } = useI18n();
  const {
    userFilters,
    userProfileMap,
    toggleUserFilter,
    timespan,
    selectYear,
    selectDay,
  } = useSocialSectionContext();

  const userFilterOpen = useSignal(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const optionsContainerRef = useRef<HTMLDivElement | null>(null);

  // The timespan filter row scrolls horizontally with the vertical wheel.
  const timespanFilterRef = useRef<HTMLDivElement | null>(null);
  useHorizontalScroll(timespanFilterRef);

  useClickOutside([optionsRef, optionsContainerRef], () => {
    userFilterOpen.value = false;
  });

  const selectedTimespanOptionId = useSignal<TimespanOptionId>("twoDays");

  const selectTimespanOption = (id: TimespanOptionId) => {
    if (selectedTimespanOptionId.value === id) return;

    const option = buildTimespanOptions()[id];
    selectedTimespanOptionId.value = id;
    // `selectYear` sets the year and clears the timespan; `selectDay` then
    // narrows to the option's window. Both writes batch within this handler.
    selectYear(option.year);
    if (option.timespan) {
      selectDay(option.timespan);
    }
  };

  const timespanLabels: Record<TimespanOptionId, string> = {
    twoDays: t("last-48-hours", { defaultValue: "Last 48 hours" }),
    week: t("this-week", { defaultValue: "This week" }),
    month: t("this-month", { defaultValue: "This month" }),
    all: t("all", { defaultValue: "All" }),
  };

  const selectedCount = [...userFilters.values()].filter(Boolean).length;
  const userFilterText =
    selectedCount === userFilters.size
      ? t("everyone", { defaultValue: "Everyone" })
      : selectedCount === 0
        ? t("none", { defaultValue: "None" })
        : t("custom", { defaultValue: "Custom" });

  const dateLabel = timespan
    ? new Intl.DateTimeFormat(language, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(timespan.to * 1000))
    : undefined;

  return (
    <div className="sb-today-history-card sb-today-section-card">
      <div
        onClick={(e) => {
          e.stopPropagation();
          userFilterOpen.value = !userFilterOpen.value;
        }}
        className="sb-today-user-filter-container sb-today-clickable"
        ref={optionsContainerRef}
      >
        <span className="sb-today-user-filter-label">{userFilterText}</span>
        <MaterialIcon>
          {userFilterOpen.value ? "keyboard_arrow_up" : "keyboard_arrow_down"}
        </MaterialIcon>
        {userFilterOpen.value && (
          <div
            ref={optionsRef}
            className="sb-today-user-filter-options"
            onClick={(e) => e.stopPropagation()}
          >
            {[...userFilters.entries()].map(([id, selected]) => {
              const profile = userProfileMap.get(id);
              if (!profile) return null;
              return (
                <button
                  key={id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUserFilter(id);
                  }}
                  className={`sb-today-user-filter-option${selected ? " sb-today-user-filter-option-selected" : ""} sb-today-clickable`}
                >
                  <div style={{ backgroundColor: profile.color }}></div>
                  {profile.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div
        className="sb-today-timespan-filter-container"
        ref={timespanFilterRef}
      >
        {TIMESPAN_OPTION_IDS.map((id) => (
          <button
            onClick={() => selectTimespanOption(id)}
            key={id}
            className={`sb-today-timespan-filter-option${selectedTimespanOptionId.value === id ? " sb-today-timespan-filter-option-selected" : ""} sb-today-clickable`}
          >
            {timespanLabels[id]}
          </button>
        ))}
      </div>
      {selectedTimespanOptionId.value === "all" && (
        <Fragment>
          <ReadingHistoryTimelineSection
            today={props.today}
            theme={props.theme}
          />
          {dateLabel && (
            <span className="sb-today-date-label">{dateLabel}</span>
          )}
        </Fragment>
      )}
      <FilteredReading
        today={props.today}
        onOpenPassage={props.onOpenPassage}
      />
    </div>
  );
}

/**
 * Adapts the shared `Tooltip` to the shape `ReadingHistoryTimeline` injects:
 * the timeline hands its renderer a `contentsData` array, the shell takes
 * children.
 */
function TimelineTooltip(props: {
  contentsData: TimelineTooltipContent[];
  anchor: TooltipAnchor;
  offsetY?: number;
}) {
  return (
    <Tooltip anchor={props.anchor} offsetY={props.offsetY}>
      {props.contentsData.map((data) => data.content)}
    </Tooltip>
  );
}

function ReadingHistoryTimelineSection(props: {
  today: TodayManager;
  theme: ReadonlySignal<BibleTheme>;
}) {
  const { itemsData, timelineRef, footer } = useReadingHistoryTimeline(props);

  return (
    <ReadingHistoryTimeline
      itemsData={itemsData}
      timelineRef={timelineRef}
      footer={footer}
      Tooltip={TimelineTooltip}
    />
  );
}

function FilteredReading(props: {
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { communityReading, userFilters } = useSocialSectionContext();

  const booksData = Object.entries(communityReading)
    .map(([bookId, chaptersReading]) => {
      const readerIds = [
        ...new Set(Object.values(chaptersReading).flat()),
      ].filter((id) => userFilters.get(id));
      return { bookId, chaptersReading, readerIds };
    })
    .filter((book) => book.readerIds.length > 0);

  if (booksData.length === 0) {
    return <></>;
  }

  return (
    <div className="sb-today-filtered-reading-container">
      {booksData.map(({ bookId, chaptersReading, readerIds }) => (
        <Book
          key={bookId}
          bookId={bookId}
          chaptersReading={chaptersReading}
          readerIds={readerIds}
          today={props.today}
          onOpenPassage={props.onOpenPassage}
        />
      ))}
    </div>
  );
}

/** A reader's avatar, as shown on a book row or inside a chapter cell. */
interface ReaderIcon {
  id: string;
  name: string;
  pictureUrl?: string | undefined;
  color: string;
  icon: string;
}

function Book(props: {
  bookId: string;
  chaptersReading: { [chapter: number]: string[] };
  readerIds: string[];
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { bookId, chaptersReading, readerIds } = props;
  const { bookNames, translationBooksMap } = props.today;
  const { userProfileMap } = useSocialSectionContext();

  const isExpanded = useSignal(false);

  // Both reads sit in the render body, which is a reactive scope, so the row
  // relabels and its chapter grid fills in as the translation's books arrive.
  // Inside a `useMemo` they would neither subscribe nor invalidate — the memo
  // this replaced listed `readerIds` alone, so it kept the book id as its label
  // once the names loaded a moment later.
  const name = bookNames.value.get(bookId) ?? bookId;
  const numberOfChapters =
    translationBooksMap.value.get(bookId)?.numberOfChapters ?? 0;

  const shownReaders: ReaderIcon[] = [];
  for (const id of readerIds.slice(0, MAX_ICONS)) {
    const profile = userProfileMap.get(id);
    // Unreachable today: `userProfileMap` holds only the signed-in user, and
    // `readerIds` is filtered through `userFilters`, which tracks exactly its
    // keys. It stops being unreachable once you can subscribe to other
    // readers, which is coming — then a reader can appear in the reading data
    // before their profile has loaded. Skipping costs one avatar; the
    // `get(id)!` this replaced threw mid-render and took the whole pane down.
    if (!profile) continue;
    shownReaders.push({
      id,
      name: profile.name,
      pictureUrl: profile.pictureUrl ?? undefined,
      color: profile.color,
      icon: profile.icon,
    });
  }
  const extraReaders = readerIds.length - shownReaders.length;
  const readersById = new Map(
    shownReaders.map((reader) => [reader.id, reader])
  );

  return (
    <div
      className={`sb-today-filtered-reading-book${
        isExpanded.value ? " sb-today-expanded" : ""
      } sb-today-clickable`}
      onClick={() => (isExpanded.value = !isExpanded.value)}
    >
      <span>{name}</span>
      <div className="sb-today-icons-container">
        {shownReaders.map((reader) => (
          <UserIcon
            key={reader.id}
            pictureUrl={reader.pictureUrl}
            color={reader.color}
            icon={reader.icon}
          />
        ))}
        {extraReaders > 0 && (
          <span className="sb-today-filtered-reading-book-extra">{`+${extraReaders}`}</span>
        )}
      </div>
      {isExpanded.value && (
        <div
          className="sb-today-chapters-container"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {Array.from({ length: numberOfChapters }, (_, index) => {
            const chapter = index + 1;
            // `readersById` holds only the first MAX_ICONS readers, so a
            // chapter read by someone past the cap has no entry here. Also
            // unreachable while community reading is just the signed-in
            // user, and also waiting on subscriptions.
            const readers = (chaptersReading[chapter] ?? [])
              .map((id) => readersById.get(id))
              .filter((reader): reader is ReaderIcon => Boolean(reader));
            return (
              <Chapter
                key={chapter}
                number={chapter}
                readers={readers}
                onClick={() => props.onOpenPassage({ bookId, chapter })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chapter(props: {
  number: number;
  readers: ReaderIcon[];
  onClick: () => void;
}) {
  const hasReaders = props.readers.length > 0;

  return (
    <div
      className={`sb-today-filtered-reading-chapter${hasReaders ? " sb-today-filtered-reading-chapter-highlighted" : ""} sb-today-clickable`}
      onClick={props.onClick}
    >
      {props.number}
      {hasReaders && (
        <div>
          {props.readers.map((reader) =>
            reader.pictureUrl ? (
              <img key={reader.id} src={reader.pictureUrl} />
            ) : (
              <div key={reader.id} style={{ backgroundColor: reader.color }}>
                <MaterialIcon>{reader.icon}</MaterialIcon>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function UserIcon(props: {
  pictureUrl?: string | undefined;
  color: string;
  icon: string;
}) {
  if (props.pictureUrl) {
    return (
      <img
        src={props.pictureUrl}
        className="sb-today-filtered-reading-book-icon"
      />
    );
  }

  return (
    <div
      className="sb-today-filtered-reading-book-icon"
      style={{ backgroundColor: props.color }}
    >
      <MaterialIcon>{props.icon}</MaterialIcon>
    </div>
  );
}
