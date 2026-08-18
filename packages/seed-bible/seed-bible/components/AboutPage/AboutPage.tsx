import "./AboutPage.css";
import { useI18n } from "../../i18n/I18nManager";
import type { createSeedBibleState } from "../../managers/SeedBibleStateManager";
import { buildReadingPath } from "../../managers/ReadingUrlPath";
import { getDefaultTranslationForLanguage } from "../../managers/BibleReadingManager";

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
  const { t, language } = useI18n();
  const { navigation } = state;

  const startReadingHref = `${navigation.basePath}${buildReadingPath({
    language,
    translationId: getDefaultTranslationForLanguage(language).id,
    bookId: "GEN",
    chapter: 1,
  })}`;

  return (
    <main className="sb-about-page" role="main">
      <header className="sb-about-header">
        <a className="sb-about-home-link" href={`${navigation.basePath}/`}>
          {t("seed-bible", { defaultValue: "Seed Bible" })}
        </a>
      </header>

      <article className="sb-about-content">
        <h1>{t("about-title", { defaultValue: "About the Seed Bible" })}</h1>

        <section>
          <h2>
            {t("about-what-is-heading", {
              defaultValue: "What is the Seed Bible?",
            })}
          </h2>
          <p>
            {t("about-what-is-body", {
              defaultValue:
                "The Seed Bible is a free Bible reading app that brings Scripture, study tools, and your own notes and highlights together in one place — online, on any device, in dozens of languages.",
            })}
          </p>
        </section>

        <section>
          <h2>
            {t("about-why-heading", {
              defaultValue: "Why we're building it",
            })}
          </h2>
          <p>
            {t("about-why-body", {
              defaultValue:
                "We believe everyone should be able to read and return to God's word without cost or friction. The Seed Bible exists to make that as easy as opening a browser tab — no accounts, paywalls, or ads between you and the text.",
            })}
          </p>
        </section>

        <section>
          <h2>
            {t("about-what-it-can-do-heading", {
              defaultValue: "What it can do",
            })}
          </h2>
          <ul>
            <li>
              {t("about-feature-translations", {
                defaultValue:
                  "Read dozens of free Bible translations, in dozens of languages, side by side.",
              })}
            </li>
            <li>
              {t("about-feature-notes-highlights", {
                defaultValue:
                  "Highlight verses, take notes, and bookmark passages that matter to you.",
              })}
            </li>
            <li>
              {t("about-feature-reading-plans", {
                defaultValue: "Follow guided reading plans, or build your own.",
              })}
            </li>
            <li>
              {t("about-feature-share", {
                defaultValue:
                  "Share what you're reading, or read together with friends in a synced session.",
              })}
            </li>
          </ul>
        </section>

        <a className="sb-about-cta" href={startReadingHref}>
          {t("about-start-reading-cta", { defaultValue: "Start reading" })}
        </a>
      </article>
    </main>
  );
}
