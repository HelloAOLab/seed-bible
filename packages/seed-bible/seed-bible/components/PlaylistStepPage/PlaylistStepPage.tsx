import "./PlaylistStepPage.css";
import type { ComponentChild, RefObject } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { VerseRef } from "../../managers/BibleDataManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistLinkContent } from "../PlaylistLinkContent/PlaylistLinkContent";
import { Button } from "../Button/Button";

type PageItem = Exclude<PlaylistItemData, { type: "bible-verse" }>;

/**
 * Scrolls whatever scrolls `ref`'s element back to the top when it mounts, so
 * a step opens at its top wherever the reader had scrolled the step before.
 */
export function useScrollToTopOnMount(ref: RefObject<HTMLElement>): void {
  useLayoutEffect(() => {
    for (let el = ref.current?.parentElement; el; el = el.parentElement) {
      const { overflowY } = getComputedStyle(el);
      if (overflowY === "auto" || overflowY === "scroll") {
        el.scrollTop = 0;
        return;
      }
    }
  }, []);
}

/**
 * The title a note, question or video step shows at the top of its page, or
 * null when it has none to show.
 */
export function playlistStepPageTitle(item: PageItem): string | null {
  return (
    item.title?.trim() ||
    (item.type === "link" ? item.preview?.title?.trim() : undefined) ||
    null
  );
}

/**
 * A playing playlist's note, question or video step, shown in the reader in
 * place of the chapter so it reads (and scrolls, with the bars tucking away)
 * like scripture does. `showTitle` is off where the reader's own header
 * carries the title instead.
 */
export function PlaylistStepPage(props: {
  item: PageItem;
  showTitle: boolean;
  /** A note's links to passages and to other steps. */
  onReferenceClick?: (ref: VerseRef) => void;
  onStepClick?: (index: number) => void;
  /** Wraps the page's content below its title (the reader's presence gutter). */
  wrapBody?: (body: ComponentChild) => ComponentChild;
}) {
  const { item, showTitle, wrapBody = (body) => body } = props;
  const title = showTitle ? playlistStepPageTitle(item) : null;
  const ref = useRef<HTMLElement>(null);
  useScrollToTopOnMount(ref);
  return (
    <article ref={ref} className="sb-playlist-step-page">
      {title ? (
        <h2 className="sb-playlist-step-page-title" dir="auto">
          {title}
        </h2>
      ) : null}
      {wrapBody(
        <div className="sb-playlist-step-page-body">
          {item.type === "html" ? (
            <>
              <PlaylistHtmlContent
                html={item.html}
                onReferenceClick={props.onReferenceClick}
                onStepClick={props.onStepClick}
              />
              {item.question?.hint?.trim() ? (
                <QuestionReveal kind="hint" html={item.question.hint} />
              ) : null}
              {item.question?.answer?.trim() ? (
                <QuestionReveal kind="answer" html={item.question.answer} />
              ) : null}
            </>
          ) : (
            <div data-presence-unit>
              <PlaylistLinkContent
                url={item.url}
                title={item.title}
                embed={item.embed}
                preview={item.preview}
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * A question step's hint or answer, hidden behind a button so the reader can
 * think about the question first. The page is rebuilt for each step, so the
 * next question starts hidden again.
 */
function QuestionReveal(props: { kind: "hint" | "answer"; html: string }) {
  const { kind, html } = props;
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const label =
    kind === "hint"
      ? shown
        ? t("playlist-question-hide-hint", { defaultValue: "Hide hint" })
        : t("playlist-question-show-hint", { defaultValue: "Show hint" })
      : shown
        ? t("playlist-question-hide-answer", { defaultValue: "Hide answer" })
        : t("playlist-question-show-answer", { defaultValue: "Show answer" });
  return (
    // One block for a shared session's presence, open or not, so revealing it
    // doesn't renumber the page for everyone else.
    <section
      className={`sb-playlist-question-reveal is-${kind}`}
      data-presence-unit
    >
      <Button
        shape="pill"
        className="sb-playlist-question-reveal-button"
        aria-expanded={shown}
        onClick={() => setShown(!shown)}
      >
        {label}
      </Button>
      {shown ? (
        <div className="sb-playlist-question-reveal-content">
          <PlaylistHtmlContent html={html} />
        </div>
      ) : null}
    </section>
  );
}
