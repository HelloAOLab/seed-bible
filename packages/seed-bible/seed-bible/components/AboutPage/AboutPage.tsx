import "./AboutPage.css";
import { useI18n } from "../../i18n/I18nManager";
import type { createSeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  CalendarStarIcon,
  CommunityIcon,
  DiscordIcon,
  DonateIcon,
  EditIcon,
  MaterialIcon,
  Playlist,
  SeedBibleIcon,
  SupportIcon,
} from "../icons";
import type { ComponentChildren } from "preact";

const CHANGELOG_URL =
  "https://github.com/HelloAOLab/seed-bible/blob/main/CHANGELOG.md";
const DONATE_URL = "https://better.giving/marketplace/1118469";
const DISCORD_URL = "https://discord.com/invite/NbEZMCJmqC";

/** The pane header title for the About page (see `SeedBibleStateManager.tsx`). */
export function AboutPaneTitle() {
  const { t } = useI18n();
  return <>{t("about-title", { defaultValue: "About Seed Bible" })}</>;
}

type CardVariant = "hero" | "highlight" | "feature";
type CardLayout = "col" | "row";
type IconSize = "lg" | "md" | "sm";

function getIconSize(variant: CardVariant): IconSize {
  switch (variant) {
    case "hero":
      return "md";
    case "highlight":
      return "lg";
    case "feature":
      return "sm";
  }
}

const Card = ({
  icon,
  title,
  body,
  variant,
  isWide,
}: {
  variant: CardVariant;
  icon: ComponentChildren;
  title: string;
  body: string;
  isWide?: boolean;
}) => {
  const layout: CardLayout = variant === "highlight" ? "row" : "col";

  const Heading = variant === "hero" ? "h1" : "h2";

  return (
    <div
      className={`sb-about-card sb-about-card-${variant} sb-about-card-${layout}${isWide ? ` sb-about-card-wide` : ""}`}
    >
      <div
        className={`sb-about-card-icon sb-about-card-icon-${getIconSize(variant)}`}
      >
        {icon}
      </div>
      <div className="sb-about-card-text">
        <Heading>{title}</Heading>
        <p>{body}</p>
      </div>
    </div>
  );
};

/**
 * The "/{lang}/about" page — a static, crawlable primer on what the Seed
 * Bible is, why it's being built, and what it can do. Rendered as a real
 * fullscreen pane (see `SeedBibleStateManager.tsx`'s About pane wiring),
 * which supplies its own header/close button, so this component owns only
 * the letter content and its actions — not a page-level title bar.
 */
export function AboutPage({
  state,
}: {
  state: ReturnType<typeof createSeedBibleState>;
}) {
  const { t } = useI18n();
  const { selector, tutorial } = state;

  return (
    <main className="sb-about-page" role="main">
      <article className="sb-about-content">
        <Card
          isWide
          icon={<SeedBibleIcon width={28} height={28} />}
          variant="hero"
          title={t("about-title", {
            defaultValue: "About Seed Bible",
          })}
          body={t("about-hero-body", {
            defaultValue:
              "A Bible for those you do life with. Read and study Scripture together, online, on any device, in dozens of languages.",
          })}
        />
        <Card
          isWide
          icon={<SupportIcon stroke="currentColor" width={21} height={21} />}
          variant="highlight"
          title={t("about-mission-title", {
            defaultValue: "Why we're building it",
          })}
          body={t("about-mission-body", {
            defaultValue:
              "We believe access to God's Word should stay simple and dependable. Seed Bible is free forever, with no ads, no paywall, and nothing between you and Scripture.",
          })}
        />
        <Card
          isWide
          icon={<CommunityIcon width={20} height={20} />}
          title={t("about-community-title", { defaultValue: "Read Together" })}
          body={t("about-community-body", {
            defaultValue:
              "Faith is meant to be lived together. Seed Bible is built for reading Scripture with your family, your closest friends, and your house church.",
          })}
          variant="feature"
        />
        <Card
          variant="feature"
          icon={<Playlist width={20} height={20} />}
          title={t("about-playlist-title", { defaultValue: "Playlists" })}
          body={t("about-playlist-body", {
            defaultValue:
              "Gather passages, links, and videos into a path through Scripture to walk through or share.",
          })}
        />
        <Card
          variant="feature"
          icon={<CalendarStarIcon width={20} height={20} />}
          title={t("about-shared-title", { defaultValue: "Community Reading" })}
          body={t("about-shared-body", {
            defaultValue:
              "Follow guided reading plans, or build your own to sustain a daily habit.",
          })}
        />
        <Card
          variant="feature"
          icon={<CommunityIcon width={20} height={20} />}
          title={t("about-sessions-title", { defaultValue: "Sessions" })}
          body={t("about-sessions-body", {
            defaultValue:
              "Read live with your group, wherever each of you is. Everyone follows along in their heart language.",
          })}
        />
        <Card
          variant="feature"
          icon={<EditIcon width={20} height={20} />}
          title={t("about-content-title", {
            defaultValue: "Notes & Highlights",
          })}
          body={t("about-content-body", {
            defaultValue:
              "Highlight what speaks to you and write down what you're learning. Your friends' notes show up right in the passage too.",
          })}
        />
        <div className="sb-about-actions">
          <button
            type="button"
            className="sb-about-action sb-about-action-primary"
            onClick={() => {
              // `selector.slot` only ever gets bound as a side effect of an
              // earlier open elsewhere (see BibleSelectorManager.tsx) — nothing
              // proactively sets it, so on a fresh "/about" visit it can still
              // be null. Resolve the current slot explicitly, the same way
              // TabsLayout's own openers do, rather than relying on that.
              const targetSlot =
                state.tabsLayout.slots.value.find(
                  (slot) => slot.id === state.tabsLayout.selectedSlotId.value
                ) ?? state.tabsLayout.slots.value[0];
              selector.setOpen(true, targetSlot);
            }}
          >
            {t("about-action-open-passage", { defaultValue: "Open a passage" })}
            <MaterialIcon>arrow_right_alt</MaterialIcon>
          </button>
          <a
            className="sb-about-action sb-about-action-secondary"
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DonateIcon width={16} height={16} />
            {t("about-action-donate", { defaultValue: "Donate" })}
          </a>
          <a
            className="sb-about-action sb-about-action-secondary"
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DiscordIcon width={16} height={16} />
            {t("about-action-discord", { defaultValue: "Join Discord" })}
          </a>
          <a
            className="sb-about-action sb-about-action-secondary"
            href={CHANGELOG_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MaterialIcon>campaign</MaterialIcon>
            {t("about-action-release-notes", { defaultValue: "Release Notes" })}
          </a>
          <button
            type="button"
            className="sb-about-action sb-about-action-secondary"
            onClick={() => tutorial.start()}
          >
            <MaterialIcon>emoji_objects</MaterialIcon>
            {t("take-a-tour", { defaultValue: "Take a tour" })}
          </button>
        </div>
      </article>
    </main>
  );
}
