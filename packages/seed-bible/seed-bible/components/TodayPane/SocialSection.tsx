import {
  useSignal,
  useSignalEffect,
  type ReadonlySignal,
} from "@preact/signals";
import { useMemo, useEffect, useRef, useCallback } from "preact/hooks";
import { Fragment, type ComponentChildren } from "preact";
import {
  SocialSectionProvider,
  useSocialSectionContext,
  type SocialSectionUserProfile,
} from "./SocialSectionContext";
import { TitledSection } from "./TitledSection";
import { Tooltip, type TooltipAnchor } from "../Tooltip/Tooltip";
import {
  useReadingHistoryTimeline,
  type TimelineTooltipContent,
} from "./useReadingHistoryTimeline";
import { MaterialIcon } from "../icons";
import { ReadingHistoryTimeline } from "../ReadingHistoryTimeline/ReadingHistoryTimeline";
import { useHorizontalScroll } from "../useHorizontalScroll";
import { useScrollEdgeFade } from "../useScrollEdgeFade";
import { useTimeContext } from "./TimeContext";
import { useI18n } from "../../i18n";
import {
  getTimelineYearTimespan,
  type Timespan,
} from "../../managers/TodayReadingHistory";
import {
  createCommunityFeedPager,
  FEED_PAGE_SIZE,
  type CommunityFeedPager,
} from "../../managers/TodayCommunityFeedPager";
import type {
  CommunityFeedItem,
  CommunityFeedKind,
  CrossedPathsFeedItem,
  NoteFeedItem,
  ReadingFeedItem,
} from "../../managers/TodayCommunityFeed";
import { formatAnnotationVerseNumbers } from "../../managers/AnnotationsManager";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";
import { displayNameOf, trimmedOrNull } from "../../managers/Utils";
import { htmlToPlainText } from "../CreateAnnotationForm/PlainTextAnnotationEditor";

const FEED_KINDS = ["all", "notes", "reading"] as const;

/** How many avatars a crossed-paths row shows before collapsing to "+N". */
const MAX_AVATARS = 4;

/**
 * Placeholders a translated sentence carries where a name or a passage goes,
 * so each can be rendered as its own emphasised element. Private-use code
 * points, so they can't collide with anything a translator would type.
 */
const NAME_PLACEHOLDER = "";
const REFERENCE_PLACEHOLDER = "";

type FeedState =
  | { status: "loading"; items: CommunityFeedItem[] }
  | { status: "ready"; items: CommunityFeedItem[] };

export const SocialSection = (props: {
  today: TodayManager;
  login: LoginManager;
  theme: ReadonlySignal<BibleTheme>;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const { getCommunityFeed, communityMembers } = props.today;
  const { t } = useI18n();
  const userId = props.login.userId.value;
  const profile = props.login.profile.value;

  // Read during render on purpose: reading the signal subscribes this
  // component, so a friend's profile arriving re-renders the section.
  const friendReaders = props.today.friendReaders.value;
  // Keyed on content rather than the array's identity, so the map below (and
  // the filters effect that stores a new Map whenever it changes) only re-runs
  // when a friend's name or picture actually changes.
  const friendsKey = friendReaders
    .map((f) => `${f.userId}\u0000${f.name ?? ""}\u0000${f.pictureUrl ?? ""}`)
    .join("\u0001");

  // Profiles for the member list: the signed-in user's own from `login`, their
  // friends' from the friends list. Derived rather than held in state: every
  // input is already to hand during render, so an effect writing it would only
  // make the map lag a render behind its own inputs.
  const userProfileMap = useMemo(() => {
    const friendsById = new Map(friendReaders.map((f) => [f.userId, f]));
    const map = new Map<string, SocialSectionUserProfile>();
    for (const memberId of communityMembers.value) {
      const visual = getUserAnimalVisual(memberId);
      const isSelf = memberId === userId;
      const friend = friendsById.get(memberId);
      map.set(memberId, {
        name: isSelf
          ? (trimmedOrNull(profile?.name) ??
            t("anonymous", { defaultValue: "Anonymous" }))
          : displayNameOf(friend ?? { userId: memberId }, t),
        pictureUrl: isSelf ? profile?.pictureUrl : friend?.pictureUrl,
        color: visual.color,
        icon: visual.defaultIcon,
      });
    }
    return map;
  }, [
    communityMembers.value,
    userId,
    profile?.name,
    profile?.pictureUrl,
    friendsKey,
    t,
  ]);

  const historyOpen = useSignal(false);
  const year = useSignal<number>(new Date().getFullYear());
  const timespan = useSignal<Timespan | undefined>(undefined);
  const kind = useSignal<CommunityFeedKind>("all");
  const history = useSignal<FeedState>({ status: "loading", items: [] });
  const pager = useSignal<CommunityFeedPager | null>(null);
  // How many older rows "See more" has revealed, counted after the kind filter.
  const olderShown = useSignal(0);
  const seeMoreBusy = useSignal(false);

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

  const toggleHistory = useCallback(() => {
    // History opens on the current year with no day picked.
    if (!historyOpen.peek()) {
      year.value = new Date().getFullYear();
      timespan.value = undefined;
    }
    historyOpen.value = !historyOpen.peek();
  }, []);

  const selectKind = useCallback((next: CommunityFeedKind) => {
    kind.value = next;
    olderShown.value = 0;
  }, []);

  // The default view: recent rows up front, older ones as "See more" asks.
  // Started afresh when the member list changes, so signing in fills the feed,
  // and whenever history closes, so coming back to it is up to date.
  useSignalEffect(() => {
    if (historyOpen.value) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    communityMembers.value;

    const next = createCommunityFeedPager(getCommunityFeed);
    pager.value = next;
    olderShown.value = 0;
    return () => next.dispose();
  });

  // The history view: the day picked in the timeline, else the whole timeline
  // year. Crossed paths are left out here; they're for recent reading (#1848).
  useSignalEffect(() => {
    if (!historyOpen.value) return;
    const span = timespan.value ?? getTimelineYearTimespan(year.value);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    communityMembers.value;

    let cancelled = false;
    // Keep the previous rows up while the next span loads: a blank card for
    // every day clicked reads as "nothing here" when it isn't.
    history.value = { status: "loading", items: history.peek().items };
    getCommunityFeed(span, { crossedPaths: false })
      .then((items) => {
        if (!cancelled) {
          history.value = { status: "ready", items };
        }
      })
      .catch((error: unknown) => {
        console.error(
          "[SocialSection] Could not load the community feed",
          error
        );
        if (!cancelled) {
          history.value = { status: "ready", items: [] };
        }
      });

    return () => {
      cancelled = true;
    };
  });

  const seeMore = async () => {
    const current = pager.peek();
    if (!current || seeMoreBusy.peek()) return;
    const kindAtClick = kind.peek();
    const target = olderShown.peek() + FEED_PAGE_SIZE;
    seeMoreBusy.value = true;
    try {
      await current.loadOlder(target, kindFilter(kindAtClick));
    } finally {
      seeMoreBusy.value = false;
    }
    if (pager.peek() === current && kind.peek() === kindAtClick) {
      olderShown.value = target;
    }
  };

  // The timeline hook reads this to know whose history to draw. Everyone in
  // the member list is shown; there is no per-person filter in this design.
  const userFilters = useSignal<Map<string, boolean>>(new Map());
  useEffect(() => {
    userFilters.value = new Map(
      [...userProfileMap.keys()].map((id) => [id, true])
    );
  }, [userProfileMap]);

  const accept = kindFilter(kind.value);
  let items: CommunityFeedItem[] = [];
  let ready = false;
  let showSeeMore = false;
  if (historyOpen.value) {
    items = history.value.items.filter(accept);
    ready = history.value.status === "ready";
  } else if (pager.value) {
    const current = pager.value;
    const older = current.older.value.filter(accept);
    items = [
      ...current.recent.value.filter(accept),
      ...older.slice(0, olderShown.value),
    ];
    ready = !current.loadingRecent.value;
    // Hidden while the pager looks ahead on its own, so the link doesn't
    // flash up only to vanish when there turns out to be nothing older.
    showSeeMore =
      ready &&
      (older.length > olderShown.value || current.mayHaveOlder.value) &&
      (seeMoreBusy.value || !current.loadingOlder.value);
  }

  return (
    <SocialSectionProvider
      value={{
        userFilters: userFilters.value,
        userProfileMap,
        year: year.value,
        timespan: timespan.value,
        selectYear,
        selectDay,
      }}
    >
      <TitledSection title={t("community", { defaultValue: "COMMUNITY" })}>
        <FeedCard
          today={props.today}
          theme={props.theme}
          selfUserId={userId}
          historyOpen={historyOpen.value}
          onToggleHistory={toggleHistory}
          kind={kind.value}
          onSelectKind={selectKind}
          items={items}
          ready={ready}
          seeMore={
            showSeeMore
              ? { busy: seeMoreBusy.value, onClick: () => void seeMore() }
              : undefined
          }
          onOpenPassage={props.onOpenPassage}
        />
      </TitledSection>
    </SocialSectionProvider>
  );
};

/** Whether a row belongs under the selected kind pill. */
function kindFilter(
  kind: CommunityFeedKind
): (item: CommunityFeedItem) => boolean {
  if (kind === "notes") return (item) => item.type === "note";
  if (kind === "reading") return (item) => item.type !== "note";
  return () => true;
}

function FeedCard(props: {
  today: TodayManager;
  theme: ReadonlySignal<BibleTheme>;
  selfUserId: string | null;
  historyOpen: boolean;
  onToggleHistory: () => void;
  kind: CommunityFeedKind;
  onSelectKind: (kind: CommunityFeedKind) => void;
  /** The rows to show, already filtered to the selected kind. */
  items: CommunityFeedItem[];
  /** False while the first rows are still loading. */
  ready: boolean;
  /** Present while there may be older rows to reveal. */
  seeMore?: { busy: boolean; onClick: () => void };
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { t, language } = useI18n();
  const { timespan } = useSocialSectionContext();

  // The kind pills scroll horizontally with the vertical wheel, and fade at
  // an edge only while pills are hidden past it.
  const kindFilterRef = useRef<HTMLDivElement | null>(null);
  useHorizontalScroll(kindFilterRef);
  useScrollEdgeFade(kindFilterRef);

  const kindLabels: Record<CommunityFeedKind, string> = {
    all: t("all", { defaultValue: "All" }),
    notes: t("notes", { defaultValue: "Notes" }),
    reading: t("feed-reading", { defaultValue: "Reading" }),
  };
  const historyLabel = t("feed-history", { defaultValue: "History" });

  const dateLabel =
    props.historyOpen && timespan
      ? new Intl.DateTimeFormat(language, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(timespan.to * 1000))
      : undefined;

  return (
    <div className="sb-today-feed-card">
      <div className="sb-today-feed-toolbar">
        <div className="sb-today-feed-kind-filter" ref={kindFilterRef}>
          {FEED_KINDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={props.kind === id}
              onClick={() => props.onSelectKind(id)}
              className={`sb-today-feed-kind-option${
                props.kind === id ? " sb-today-feed-kind-option-selected" : ""
              } sb-today-clickable`}
            >
              {kindLabels[id]}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={props.historyOpen}
          aria-label={historyLabel}
          title={historyLabel}
          onClick={props.onToggleHistory}
          className={`sb-today-feed-history-button${
            props.historyOpen ? " sb-today-feed-history-button-selected" : ""
          } sb-today-clickable`}
        >
          <MaterialIcon>history</MaterialIcon>
        </button>
      </div>
      {props.historyOpen && (
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
      {props.items.length > 0 ? (
        <ul className="sb-today-feed-list">
          {props.items.map((item) => (
            <FeedRow
              key={item.id}
              item={item}
              selfUserId={props.selfUserId}
              today={props.today}
              onOpenPassage={props.onOpenPassage}
            />
          ))}
        </ul>
      ) : props.ready ? (
        <p className="sb-today-feed-empty">
          {props.kind === "notes"
            ? t("feed-empty-notes", {
                defaultValue: "No notes in this time frame yet.",
              })
            : props.kind === "reading"
              ? t("feed-empty-reading", {
                  defaultValue: "No reading in this time frame yet.",
                })
              : t("feed-empty", {
                  defaultValue: "No activity in this time frame yet.",
                })}
        </p>
      ) : null}
      {props.seeMore && (
        <button
          type="button"
          className="sb-today-feed-see-more"
          onClick={props.seeMore.onClick}
          disabled={props.seeMore.busy}
          aria-busy={props.seeMore.busy}
        >
          {t("see-more", { defaultValue: "See more" })}
        </button>
      )}
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

// ─── rows ──────────────────────────────────────────────────────────────────

function FeedRow(props: {
  item: CommunityFeedItem;
  selfUserId: string | null;
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { item } = props;
  switch (item.type) {
    case "note":
      return <NoteRow {...props} item={item} />;
    case "crossed-paths":
      return <CrossedPathsRow {...props} item={item} />;
    case "reading":
      return <ReadingRow {...props} item={item} />;
  }
}

function NoteRow(props: {
  item: NoteFeedItem;
  selfUserId: string | null;
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { item } = props;
  const { t } = useI18n();
  const { userProfileMap } = useSocialSectionContext();
  const bookName = props.today.bookNames.value.get(item.bookId) ?? item.bookId;
  const reference =
    item.verses.length > 0
      ? `${bookName} ${item.chapter}:${formatAnnotationVerseNumbers(item.verses)}`
      : `${bookName} ${item.chapter}`;
  const name = displayName(
    item.userId,
    props.selfUserId,
    userProfileMap.get(item.userId),
    t
  );
  const sentence = item.isReply
    ? t("feed-replied-on", {
        name: NAME_PLACEHOLDER,
        reference: REFERENCE_PLACEHOLDER,
        defaultValue: "{{name}} replied on {{reference}}",
      })
    : t("feed-noted-on", {
        name: NAME_PLACEHOLDER,
        reference: REFERENCE_PLACEHOLDER,
        defaultValue: "{{name}} noted on {{reference}}",
      });
  // Flattened to text: the feed quotes a note, it doesn't host its formatting,
  // and a note is somebody else's markup.
  const text = useMemo(() => htmlToPlainText(item.html).trim(), [item.html]);

  return (
    <li className="sb-today-feed-row sb-today-feed-row-note">
      <FeedAvatars userIds={[item.userId]} />
      <div className="sb-today-feed-row-body">
        <FeedSentence
          sentence={sentence}
          name={name}
          reference={reference}
          onOpenReference={() =>
            props.onOpenPassage({
              bookId: item.bookId,
              chapter: item.chapter,
              verse: item.verses[0],
            })
          }
        />
        {text && (
          <blockquote className="sb-today-feed-note-text">{text}</blockquote>
        )}
        <FeedTime seconds={item.time} />
      </div>
    </li>
  );
}

function CrossedPathsRow(props: {
  item: CrossedPathsFeedItem;
  selfUserId: string | null;
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { item } = props;
  const { t, language } = useI18n();
  const { userProfileMap } = useSocialSectionContext();
  const bookName = props.today.bookNames.value.get(item.bookId) ?? item.bookId;
  const reference = `${bookName} ${formatAnnotationVerseNumbers(item.chapters)}`;

  // "You" leads, the way the sentence is read.
  const orderedIds = [
    ...item.userIds.filter((id) => id === props.selfUserId),
    ...item.userIds.filter((id) => id !== props.selfUserId),
  ];
  const names = formatNameList(
    orderedIds.map((id) =>
      displayName(id, props.selfUserId, userProfileMap.get(id), t)
    ),
    language
  );
  const sentence =
    orderedIds.length > 2
      ? t("feed-all-read", {
          names: NAME_PLACEHOLDER,
          reference: REFERENCE_PLACEHOLDER,
          defaultValue: "{{names}} all read {{reference}}",
        })
      : t("feed-both-read", {
          names: NAME_PLACEHOLDER,
          reference: REFERENCE_PLACEHOLDER,
          defaultValue: "{{names}} both read {{reference}}",
        });

  return (
    <li className="sb-today-feed-row sb-today-feed-row-crossed-paths">
      <FeedAvatars userIds={orderedIds} />
      <div className="sb-today-feed-row-body">
        <FeedSentence
          sentence={sentence}
          name={names}
          reference={reference}
          onOpenReference={() =>
            props.onOpenPassage({
              bookId: item.bookId,
              chapter: item.chapters[0] ?? 1,
            })
          }
        />
      </div>
      <FeedTime seconds={item.time} />
    </li>
  );
}

function ReadingRow(props: {
  item: ReadingFeedItem;
  selfUserId: string | null;
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { item } = props;
  const { t } = useI18n();
  const { userProfileMap } = useSocialSectionContext();
  const bookName = props.today.bookNames.value.get(item.bookId) ?? item.bookId;
  const reference = `${bookName} ${formatAnnotationVerseNumbers(item.chapters)}`;
  const name = displayName(
    item.userId,
    props.selfUserId,
    userProfileMap.get(item.userId),
    t
  );

  return (
    <li className="sb-today-feed-row sb-today-feed-row-reading">
      <FeedAvatars userIds={[item.userId]} />
      <div className="sb-today-feed-row-body">
        <FeedSentence
          sentence={t("feed-read", {
            name: NAME_PLACEHOLDER,
            reference: REFERENCE_PLACEHOLDER,
            defaultValue: "{{name}} read {{reference}}",
          })}
          name={name}
          reference={reference}
          onOpenReference={() =>
            props.onOpenPassage({
              bookId: item.bookId,
              chapter: item.chapters[0] ?? 1,
            })
          }
        />
      </div>
      <FeedTime seconds={item.time} />
    </li>
  );
}

// ─── pieces ────────────────────────────────────────────────────────────────

/**
 * A translated sentence with its name and passage rendered as emphasised
 * elements, in whatever order the translation put them. The passage is a
 * button that opens it in the reader.
 */
function FeedSentence(props: {
  sentence: string;
  name: string;
  reference: string;
  onOpenReference: () => void;
}) {
  const parts: ComponentChildren[] = [];
  const pattern = new RegExp(`[${NAME_PLACEHOLDER}${REFERENCE_PLACEHOLDER}]`);
  let rest = props.sentence;
  let key = 0;
  while (rest.length > 0) {
    const match = pattern.exec(rest);
    if (!match) {
      parts.push(rest);
      break;
    }
    if (match.index > 0) {
      parts.push(rest.slice(0, match.index));
    }
    parts.push(
      match[0] === NAME_PLACEHOLDER ? (
        <strong key={key++} className="sb-today-feed-name">
          {props.name}
        </strong>
      ) : (
        <button
          key={key++}
          type="button"
          className="sb-today-feed-reference sb-today-clickable"
          onClick={props.onOpenReference}
        >
          {props.reference}
        </button>
      )
    );
    rest = rest.slice(match.index + 1);
  }
  return <p className="sb-today-feed-sentence">{parts}</p>;
}

/** One avatar, or an overlapping stack for a crossed-paths row. */
function FeedAvatars(props: { userIds: string[] }) {
  const { userProfileMap } = useSocialSectionContext();
  const shown = props.userIds.slice(0, MAX_AVATARS);
  const extra = props.userIds.length - shown.length;
  return (
    <div className="sb-today-feed-avatars">
      {shown.map((id) => {
        const profile = userProfileMap.get(id);
        // A reader can appear in the feed before their profile has loaded;
        // their colour and icon are a hash of their id, so those still show.
        const visual = getUserAnimalVisual(id);
        return (
          <UserIcon
            key={id}
            pictureUrl={profile?.pictureUrl ?? undefined}
            color={profile?.color ?? visual.color}
            icon={profile?.icon ?? visual.defaultIcon}
            title={profile?.name}
          />
        );
      })}
      {extra > 0 && (
        <span className="sb-today-feed-avatars-extra">{`+${extra}`}</span>
      )}
    </div>
  );
}

function UserIcon(props: {
  pictureUrl?: string | undefined;
  color: string;
  icon: string;
  title?: string | undefined;
}) {
  if (props.pictureUrl) {
    return (
      <img
        src={props.pictureUrl}
        alt=""
        title={props.title}
        className="sb-today-feed-avatar"
      />
    );
  }

  return (
    <div
      className="sb-today-feed-avatar"
      title={props.title}
      style={{ backgroundColor: props.color }}
    >
      <MaterialIcon>{props.icon}</MaterialIcon>
    </div>
  );
}

/**
 * When something happened, the way a feed says it: the clock time if today,
 * "Yesterday" if yesterday, otherwise the date. Re-renders with the shared
 * tick so a row written at 23:59 becomes "Yesterday" without a reload.
 */
function FeedTime(props: { seconds: number }) {
  const { t, language } = useI18n();
  const { tick } = useTimeContext();
  const label = useMemo(
    () => formatFeedTime(props.seconds * 1000, language, t, Date.now()),
    // `tick` is the clock; see above.
    [props.seconds, language, t, tick]
  );
  return (
    <time
      className="sb-today-feed-time"
      dateTime={new Date(props.seconds * 1000).toISOString()}
    >
      {label}
    </time>
  );
}

export function formatFeedTime(
  timeMs: number,
  language: string,
  t: (key: string, options: { defaultValue: string }) => string,
  nowMs: number
): string {
  const time = new Date(timeMs);
  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (time >= today) {
    return new Intl.DateTimeFormat(language, {
      hour: "numeric",
      minute: "2-digit",
    }).format(time);
  }
  if (time >= yesterday) {
    return t("yesterday", { defaultValue: "Yesterday" });
  }
  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    ...(time.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  }).format(time);
}

function displayName(
  userId: string,
  selfUserId: string | null,
  profile: SocialSectionUserProfile | undefined,
  t: (key: string, options: { defaultValue: string }) => string
): string {
  if (userId === selfUserId) {
    return t("you", { defaultValue: "You" });
  }
  return profile?.name ?? t("anonymous", { defaultValue: "Anonymous" });
}

/** "You and Jonah", "You, Jonah and Ruth" — in the language's own idiom. */
function formatNameList(names: string[], language: string): string {
  try {
    return new Intl.ListFormat(language, {
      style: "long",
      type: "conjunction",
    }).format(names);
  } catch {
    return names.join(", ");
  }
}
