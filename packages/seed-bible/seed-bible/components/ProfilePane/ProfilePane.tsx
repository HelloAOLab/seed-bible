import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { ReadingPlanProgress } from "../../managers/ReadingPlansManager";
import {
  formatReadingPlanId,
  getReadingCalendar,
  summarizeCalendar,
} from "../../managers/ReadingPlansManager";
import { FEATURE_KEY_READING_PLANS } from "../../managers/FeaturesManager";
import { getSelfDisplayName } from "../Tabs/Tabs";
import { ExpandableText } from "../ExpandableText/ExpandableText";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n";
import "./ProfilePane.css";

export const PROFILE_PANE_ID = "profile-screen-pane";

export interface ProfileScreenProps {
  state: SeedBibleState;
  /** Opens the "Edit profile" screen (name, location, description). */
  onEditProfile: () => void;
  /** Opens the picture cropper straight away, without an intermediate screen. */
  onEditPicture: () => void;
  /** Opens the reading plans pane. */
  onOpenReadingPlans: () => void;
  /** Opens the "Your content" screen. */
  onOpenYourContent: () => void;
}

/** Pane header title. A component so it can call `useI18n`. */
export function ProfilePaneTitle() {
  const { t } = useI18n();
  return <>{t("profile", { defaultValue: "Profile" })}</>;
}

/**
 * The user's initials, for the avatar when they have no profile picture. Takes
 * the first letter of the first two words, so "Craig Anders" reads "CA" and a
 * single-word name reads as one letter. Uppercasing is left to CSS.
 */
export function getInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("");
}

/** The most recent progress the user has for a given plan id, if any. */
function latestProgress(
  progresses: ReadingPlanProgress[],
  planId: string
): ReadingPlanProgress | null {
  return (
    progresses
      .filter((p) => p.planId === planId)
      .sort((a, b) => b.startedAtMs - a.startedAtMs)[0] ?? null
  );
}

/** What the reading-plans card shows, once a plan in progress has been found. */
interface ActivePlanSummary {
  title: string | null;
  /** Fraction of the plan's reading days completed, 0–1. */
  fraction: number;
  dayNumber: number;
  totalDays: number;
  streak: number;
}

/**
 * The plan the card should feature: the user's furthest-along plan that still
 * has a day left to read. Returns null when they have no plans, none started,
 * or every one is finished — the card then invites them to browse instead.
 */
function findActivePlan(state: SeedBibleState): ActivePlanSummary | null {
  const { readingPlans } = state;
  const metas = readingPlans.userReadingPlans.value;
  const fullPlans = readingPlans.fullReadingPlans.value;
  const progresses = readingPlans.userReadingPlanProgresses.value;
  const nowMs = Date.now();

  const fullById = new Map(
    fullPlans.map((p) => [formatReadingPlanId(p.recordName, p.address), p])
  );

  let best: ActivePlanSummary | null = null;
  for (const meta of metas) {
    if (meta.status === "draft") continue;
    const planId = formatReadingPlanId(meta.recordName, meta.address);
    const progress = latestProgress(progresses, planId);
    const full = fullById.get(planId);
    if (!progress || !full) continue;

    const summary = summarizeCalendar(
      getReadingCalendar(full, progress, nowMs),
      nowMs,
      progress.timeZone
    );
    if (summary.totalDays === 0 || summary.next == null) continue;

    const candidate: ActivePlanSummary = {
      title: meta.title,
      fraction: summary.doneDays / summary.totalDays,
      dayNumber: summary.nextDayNumber ?? summary.doneDays + 1,
      totalDays: summary.totalDays,
      streak: summary.streak,
    };
    if (!best || candidate.fraction > best.fraction) {
      best = candidate;
    }
  }
  return best;
}

/**
 * A pane-header back button that returns to the Profile screen. Used by the
 * screens reached from Profile — "Your content" and "Edit profile" — which are
 * fullscreen panes, so opening one closes Profile behind it; without this the
 * only way out is the close button, which drops the user back at the reader.
 */
export function ProfileBackButton(props: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="sb-profile-pane-back"
      onClick={props.onBack}
      aria-label={t("back", { defaultValue: "Back" })}
      title={t("back", { defaultValue: "Back" })}
    >
      <MaterialIcon>arrow_back</MaterialIcon>
    </button>
  );
}

/**
 * The avatar and its edit affordance, as one tap target. Clicking anywhere on
 * it opens the picture cropper directly — there is no intermediate screen.
 * The badge is a pencil once a picture is set and a "+" while there is none,
 * so it reads as "replace this" rather than "add one" when there already is.
 */
export function ProfileAvatarButton(props: {
  state: SeedBibleState;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  const pictureUrl = props.state.login.profile.value?.pictureUrl ?? null;
  const displayName = getSelfDisplayName(props.state, t);

  return (
    <button
      type="button"
      className="sb-profile-avatar-button"
      onClick={props.onEdit}
      aria-label={t("change-profile-picture", {
        defaultValue: "Change profile picture",
      })}
    >
      <span
        className="sb-profile-avatar"
        style={
          pictureUrl ? { backgroundImage: `url(${pictureUrl})` } : undefined
        }
      >
        {pictureUrl ? null : getInitials(displayName)}
      </span>
      <span className="sb-profile-avatar-edit" aria-hidden="true">
        <MaterialIcon>{pictureUrl ? "edit" : "add"}</MaterialIcon>
      </span>
    </button>
  );
}

/**
 * Email address and, when the user has set one, their location — the line of
 * small print between the avatar and the name.
 */
export function ProfileContactLine(props: { state: SeedBibleState }) {
  const { login } = props.state;
  const email = login.userInfo.value?.email ?? null;
  const location = login.profile.value?.location ?? null;

  if (!email && !location) {
    return null;
  }

  return (
    <p className="sb-profile-contact">
      {email ? <span className="sb-profile-email">{email}</span> : null}
      {location ? (
        <span className="sb-profile-location">
          <MaterialIcon aria-hidden="true">location_on</MaterialIcon>
          {location}
        </span>
      ) : null}
    </p>
  );
}

/** A tappable card: icon tile, title, subtitle, and a trailing arrow. */
function ProfileRow(props: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="sb-profile-row" onClick={props.onClick}>
      <span className="sb-profile-tile" aria-hidden="true">
        <MaterialIcon>{props.icon}</MaterialIcon>
      </span>
      <span className="sb-profile-row-text">
        <span className="sb-profile-row-title">{props.title}</span>
        <span className="sb-profile-row-subtitle">{props.subtitle}</span>
      </span>
      <span className="sb-profile-row-arrow" aria-hidden="true">
        <MaterialIcon>arrow_forward</MaterialIcon>
      </span>
    </button>
  );
}

/** The reading-plans card: progress bar, plan name, day count and streak. */
function ReadingPlansCard(props: {
  state: SeedBibleState;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const plan = findActivePlan(props.state);

  return (
    <button type="button" className="sb-profile-plans" onClick={props.onOpen}>
      <span className="sb-profile-plans-head">
        <span className="sb-profile-tile" aria-hidden="true">
          <MaterialIcon>menu_book</MaterialIcon>
        </span>
        <span className="sb-profile-plans-title">
          {t("my-reading-plans", { defaultValue: "My reading plans" })}
        </span>
        <span className="sb-profile-plans-link">
          {t("all-plans", { defaultValue: "All plans" })}
          <MaterialIcon>arrow_forward</MaterialIcon>
        </span>
      </span>

      {plan ? (
        <>
          <span
            className="sb-profile-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={plan.totalDays}
            aria-valuenow={plan.dayNumber}
          >
            <span
              className="sb-profile-progress-fill"
              style={{ width: `${Math.round(plan.fraction * 100)}%` }}
            />
          </span>
          <span className="sb-profile-plans-foot">
            <span className="sb-profile-plans-name">
              {plan.title ??
                t("untitled-reading-plan", { defaultValue: "Untitled plan" })}
            </span>
            <span className="sb-profile-plans-stats">
              {t("plan-day-of", {
                day: plan.dayNumber,
                total: plan.totalDays,
                defaultValue: "Day {{day}} of {{total}}",
              })}
              {plan.streak > 0 ? (
                <>
                  {" · "}
                  <MaterialIcon>local_fire_department</MaterialIcon>
                  {plan.streak}
                </>
              ) : null}
            </span>
          </span>
        </>
      ) : (
        <span className="sb-profile-plans-foot">
          <span className="sb-profile-plans-name">
            {t("no-active-reading-plan", {
              defaultValue: "You haven't started a plan yet.",
            })}
          </span>
        </span>
      )}
    </button>
  );
}

/**
 * The Profile screen (issue #1555): who you are, what you're reading, and the
 * way in to your own content. Opened as a fullscreen pane from the mobile
 * "You" tab and the desktop sidebar avatar.
 *
 * Circles, friends and profile subscriptions appear in the Figma frame but are
 * deliberately not built here — #1552 holds them back until their designs are
 * settled, and neither has a backend yet.
 */
export function ProfilePane(props: ProfileScreenProps) {
  const { state, onEditProfile, onEditPicture, onOpenReadingPlans } = props;
  const { login, features } = state;
  const { t } = useI18n();

  const userId = login.userId.value;
  const profile = login.profile.value;
  const displayName = getSelfDisplayName(state, t);
  const description = profile?.description ?? null;
  const plansEnabled = features.isFeatureEnabled(
    FEATURE_KEY_READING_PLANS
  ).value;

  if (!userId) {
    return (
      <div className="sb-profile-screen">
        <div className="sb-profile-content">
          <div className="sb-profile-identity">
            <span className="sb-profile-avatar" aria-hidden="true">
              <MaterialIcon>account_circle</MaterialIcon>
            </span>
            <p className="sb-profile-signin-hint">
              {t("profile-signed-out-message", {
                defaultValue:
                  "Sign in to keep your highlights, notes and plans on every device.",
              })}
            </p>
            <button
              type="button"
              className="sb-profile-signin"
              onClick={() => void login.login()}
            >
              {t("log-in", { defaultValue: "Log in" })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sb-profile-screen">
      <div className="sb-profile-content">
        <div className="sb-profile-identity">
          {/*
           * Editing is a pencil in the corner of the card rather than a
           * labelled button, so the card stays about the person. The inset is
           * logical, which puts the pencil top-left under an RTL language.
           */}
          <button
            type="button"
            className="sb-profile-card-edit"
            onClick={onEditProfile}
            aria-label={t("edit-profile", { defaultValue: "Edit profile" })}
            title={t("edit-profile", { defaultValue: "Edit profile" })}
          >
            <MaterialIcon>edit</MaterialIcon>
          </button>

          <ProfileAvatarButton state={state} onEdit={onEditPicture} />

          <ProfileContactLine state={state} />

          {/* The name is the second way in to the edit screen. */}
          <button
            type="button"
            className="sb-profile-name-button"
            onClick={onEditProfile}
          >
            <span className="sb-profile-name">{displayName}</span>
          </button>

          {description ? (
            <ExpandableText
              className="sb-profile-description"
              readMoreLabel={t("read-more", { defaultValue: "Read more" })}
              readLessLabel={t("read-less", { defaultValue: "Read less" })}
            >
              {description}
            </ExpandableText>
          ) : null}
        </div>

        {plansEnabled ? (
          <ReadingPlansCard state={state} onOpen={onOpenReadingPlans} />
        ) : null}

        <ProfileRow
          icon="edit"
          title={t("your-content", { defaultValue: "Your content" })}
          subtitle={t("your-content-subtitle", {
            defaultValue: "Create and manage your content",
          })}
          onClick={props.onOpenYourContent}
        />

        <button
          type="button"
          className="sb-profile-logout"
          onClick={() => void login.logout()}
        >
          {t("log-out", { defaultValue: "Log out" })}
        </button>
      </div>
    </div>
  );
}
