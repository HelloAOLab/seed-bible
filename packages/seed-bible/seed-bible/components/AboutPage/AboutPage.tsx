import "./AboutPage.css";
import { useI18n } from "../../i18n/I18nManager";
import type { createSeedBibleState } from "../../managers/SeedBibleStateManager";

const CHANGELOG_URL =
  "https://github.com/HelloAOLab/seed-bible/blob/main/CHANGELOG.md";
const DONATE_URL = "https://better.giving/marketplace/1118469";
const DISCORD_URL = "https://discord.com/invite/NbEZMCJmqC";

/**
 * The "/{lang}/about" page — a static, crawlable primer on what the Seed
 * Bible is, why it's being built, and what it can do. Rendered in place of
 * the reader chrome (see `MainContent` in `app/main.tsx`) rather than as
 * another pane or modal, since it needs its own indexable URL.
 */
export function AboutPage({
  state,
}: {
  state: ReturnType<typeof createSeedBibleState>;
}) {
  const { t } = useI18n();
  const { navigation, selector, tutorial } = state;

  return (
    <main className="sb-about-page" role="main">
      <header className="sb-about-header">
        <a className="sb-about-home-link" href={`${navigation.basePath}/`}>
          {t("seed-bible", { defaultValue: "Seed Bible" })}
        </a>
      </header>

      <article className="sb-about-content">
        <h1>{t("about-title", { defaultValue: "About Seed Bible" })}</h1>

        <p>
          {t("about-intro-community", {
            defaultValue:
              "Seed Bible is a Bible for building a life in Scripture with those you actually do life with; your family, your closest friends, your house church. We believe Christian faith is meant to be lived together, and we want Scripture to become part of the ordinary life you already share with the people closest to you.",
          })}
        </p>

        <p>
          {t("about-intro-free", {
            defaultValue:
              "We also believe access to God's Word should stay simple and dependable. Seed Bible is free forever, with no ads, no paywall, and no gimmicks between you and Scripture.",
          })}
        </p>

        <p>
          {t("about-updates-before-release-notes", {
            defaultValue:
              "We're constantly improving and adding new capabilities — check the ",
          })}
          <a href={CHANGELOG_URL} target="_blank" rel="noopener noreferrer">
            {t("about-updates-release-notes-link", {
              defaultValue: "latest release notes",
            })}
          </a>
          {t("about-updates-between-links", {
            defaultValue: " to see what's new, or explore the ",
          })}
          <button
            type="button"
            className="sb-about-inline-action"
            onClick={() => tutorial.start()}
          >
            {t("about-updates-tutorials-link", { defaultValue: "tutorials" })}
          </button>
          {t("about-updates-after-tutorials", {
            defaultValue: " to learn more.",
          })}
        </p>

        <p>
          {t("about-mission", {
            defaultValue:
              "Seed Bible is built and maintained by AO Lab, a 501(c)(3) nonprofit. Please pray for this ministry you are part of, and consider supporting the work financially or joining the Discord community to contribute in whatever way you feel led!",
          })}
        </p>

        <p>{t("about-thank-you", { defaultValue: "Thank you!" })}</p>

        <p className="sb-about-signature">
          {t("about-signoff", { defaultValue: "In Christ alone," })}
          <br />
          {t("about-team", { defaultValue: "The AO Lab Team" })}
        </p>
      </article>

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
        </button>
        <a
          className="sb-about-action sb-about-action-secondary"
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("about-action-donate", { defaultValue: "Donate" })}
        </a>
        <a
          className="sb-about-action sb-about-action-secondary"
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("about-action-discord", { defaultValue: "Join Discord" })}
        </a>
      </div>
    </main>
  );
}
