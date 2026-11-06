import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import {
  canonicalBookIndex,
  parseVerseReference,
} from "../../managers/BibleDataManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type {
  CompareLayout,
  PlaylistItemData,
  PlaylistManager,
  VerseRef,
} from "../../managers/PlaylistManager";
import { resolveLinkMedia } from "../../managers/resolveLinkMedia";
import { safeImageUrl } from "../../managers/linkPreview";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { passageVerses } from "../scripturePassage";
import { PeIcon } from "./editorControls";
import { PlaylistNoteComposer } from "./PlaylistNoteComposer";
import {
  formatVerseRef,
  playlistStepKind,
  playlistStepKindName,
  questionFromHtml,
  questionToHtml,
} from "./playlistSteps";

type Translate = ReturnType<typeof useI18n>["t"];
type ScriptureItem = Extract<PlaylistItemData, { type: "bible-verse" }>;
type HtmlItem = Extract<PlaylistItemData, { type: "html" }>;
type LinkItem = Extract<PlaylistItemData, { type: "link" }>;

/** Shared by every step card: which step it is and how to change it. */
export interface StepCardContext {
  playlists: PlaylistManager;
  index: number;
  count: number;
  loadChapter?: ScriptureChapterLoader;
  books: TranslationBook[];
  resolveBookName: (bookId: string) => string;
}

function Field(props: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ComponentChildren;
}) {
  return (
    <div className="sb-pe-field">
      <div className="sb-pe-field-head">
        <label className="sb-pe-field-label" htmlFor={props.htmlFor}>
          {props.label}
        </label>
        {props.hint ? (
          <span className="sb-pe-field-hint">{props.hint}</span>
        ) : null}
      </div>
      {props.children}
    </div>
  );
}

function TitleField(props: {
  id: string;
  value: string;
  onInput: (value: string) => void;
  t: Translate;
  /** Shown while the title is empty, in place of the usual example. */
  placeholder?: string;
}) {
  const { t } = props;
  return (
    <Field
      label={t("playlist-editor-title", { defaultValue: "Title" })}
      hint={t("playlist-editor-title-hint", {
        defaultValue: "Optional — a short heading",
      })}
      htmlFor={props.id}
    >
      <input
        id={props.id}
        className="sb-pe-input"
        type="text"
        dir="auto"
        value={props.value}
        placeholder={
          props.placeholder ||
          t("playlist-editor-title-placeholder", {
            defaultValue: "e.g. Before we begin",
          })
        }
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
    </Field>
  );
}

function Eyebrow(props: { index: number; item: PlaylistItemData }) {
  const { t } = useI18n();
  return (
    <p className="sb-pe-eyebrow">
      {t("playlist-editor-step-eyebrow", {
        step: props.index + 1,
        kind: playlistStepKindName(playlistStepKind(props.item), t),
        defaultValue: "Step {{step}} · {{kind}}",
      })}
    </p>
  );
}

function NoteCard(props: { ctx: StepCardContext; item: HtmlItem }) {
  const { ctx, item } = props;
  const { t } = useI18n();
  const update = (changes: Partial<HtmlItem>) =>
    ctx.playlists.updateEditingPlaylistItem(ctx.index, { ...item, ...changes });
  return (
    <>
      <TitleField
        id={`sb-pe-title-${ctx.index}`}
        value={item.title ?? ""}
        t={t}
        onInput={(value) => update({ title: value || undefined })}
      />
      <Field
        label={t("playlist-step-note", { defaultValue: "Note" })}
        hint={t("playlist-editor-note-hint", {
          defaultValue: "What readers see between steps",
        })}
      >
        <PlaylistNoteComposer
          boxed
          tall
          formatting
          initialHtml={item.html}
          placeholder={t("playlist-editor-note-placeholder", {
            defaultValue: "Write what readers see between steps",
          })}
          steps={[]}
          footer={(text) =>
            t("playlist-editor-characters", {
              characters: text.length,
              defaultValue: "{{characters}} characters",
            })
          }
          onChange={(html) => update({ html })}
        />
      </Field>
    </>
  );
}

function QuestionCard(props: { ctx: StepCardContext; item: HtmlItem }) {
  const { ctx, item } = props;
  const { t } = useI18n();
  // Kept as typed, so a trailing space survives until the next word.
  const [question, setQuestion] = useState(() => questionFromHtml(item.html));
  const update = (changes: Partial<HtmlItem>) =>
    ctx.playlists.updateEditingPlaylistItem(ctx.index, { ...item, ...changes });
  const questionId = `sb-pe-question-${ctx.index}`;
  const hintId = `sb-pe-question-hint-${ctx.index}`;
  const answerId = `sb-pe-question-answer-${ctx.index}`;

  return (
    <>
      <Field
        label={t("playlist-step-question", { defaultValue: "Question" })}
        hint={t("playlist-editor-question-hint", {
          defaultValue: "Keep it open-ended",
        })}
        htmlFor={questionId}
      >
        <textarea
          id={questionId}
          className="sb-pe-textarea"
          dir="auto"
          rows={3}
          value={question}
          placeholder={t("playlist-editor-question-placeholder", {
            defaultValue: "e.g. What does light reveal in your life this week?",
          })}
          onInput={(event) => {
            const value = event.currentTarget.value;
            setQuestion(value);
            update({ html: questionToHtml(value) });
          }}
        />
      </Field>
      <Field
        label={t("playlist-editor-reader-hint", {
          defaultValue: "Hint for readers",
        })}
        hint={t("playlist-editor-reader-hint-hint", {
          defaultValue: "Optional — helps them get started",
        })}
        htmlFor={hintId}
      >
        <input
          id={hintId}
          className="sb-pe-input"
          type="text"
          dir="auto"
          value={item.question?.hint ?? ""}
          placeholder={t("playlist-editor-reader-hint-placeholder", {
            defaultValue: "e.g. Think about a moment this week",
          })}
          onInput={(event) =>
            update({
              question: {
                ...item.question,
                hint: event.currentTarget.value || undefined,
              },
            })
          }
        />
      </Field>
      <Field
        label={t("playlist-editor-answer", { defaultValue: "Answer" })}
        hint={t("playlist-editor-answer-hint", { defaultValue: "Optional" })}
        htmlFor={answerId}
      >
        <textarea
          id={answerId}
          className="sb-pe-textarea"
          dir="auto"
          rows={3}
          value={item.question?.answer ?? ""}
          placeholder={t("playlist-editor-answer-placeholder", {
            defaultValue: "e.g. In the way He provides, even in small things",
          })}
          onInput={(event) =>
            update({
              question: {
                ...item.question,
                answer: event.currentTarget.value || undefined,
              },
            })
          }
        />
      </Field>
    </>
  );
}

/** How long typing in the link field waits before the step takes the link. */
const LINK_COMMIT_DELAY_MS = 400;

function LinkCard(props: { ctx: StepCardContext; item: LinkItem }) {
  const { ctx, item } = props;
  const { t } = useI18n();
  const kind = playlistStepKind(item);
  const [url, setUrl] = useState(item.url);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    []
  );
  const update = (changes: Partial<LinkItem>) =>
    ctx.playlists.updateEditingPlaylistItem(ctx.index, { ...item, ...changes });

  const trimmed = url.trim();
  const parses = URL.canParse(trimmed);
  const isVideo = parses && kind === "video" && trimmed === item.url;
  const media = parses ? resolveLinkMedia(trimmed) : null;
  const looksRight =
    parses &&
    (kind !== "video" || media?.kind === "embed" || media?.kind === "video");
  const thumb = safeImageUrl(item.preview?.imageUrl);
  const linkId = `sb-pe-link-${ctx.index}`;

  return (
    <>
      {/* One title: the playlist author's, or else the page's own, shown as
          the placeholder (and the step's label) whenever theirs is empty. */}
      <TitleField
        id={`sb-pe-title-${ctx.index}`}
        value={item.title ?? ""}
        t={t}
        placeholder={item.preview?.title}
        onInput={(value) => update({ title: value || undefined })}
      />
      <Field
        label={
          kind === "video"
            ? t("playlist-editor-video-link", { defaultValue: "Video link" })
            : kind === "audio"
              ? t("playlist-editor-audio-link", { defaultValue: "Audio link" })
              : t("playlist-editor-link", { defaultValue: "Link" })
        }
        hint={
          kind === "video"
            ? t("playlist-editor-video-link-hint", {
                defaultValue: "YouTube or Vimeo",
              })
            : undefined
        }
        htmlFor={linkId}
      >
        <input
          id={linkId}
          className={`sb-pe-input${trimmed && !looksRight ? " sb-pe-input--invalid" : ""}`}
          type="url"
          value={url}
          placeholder={t("playlist-editor-video-link-placeholder", {
            defaultValue: "https://youtube.com/watch?v=…",
          })}
          onInput={(event) => {
            const value = event.currentTarget.value;
            setUrl(value);
            if (commitTimer.current) clearTimeout(commitTimer.current);
            commitTimer.current = setTimeout(() => {
              const next = value.trim();
              if (next !== item.url) {
                // The old link's preview doesn't describe the new one.
                update({ url: next, preview: undefined });
              }
            }, LINK_COMMIT_DELAY_MS);
          }}
        />
        {trimmed && looksRight ? (
          <div className="sb-pe-link-check">
            <span
              className="sb-pe-link-thumb"
              style={thumb ? { backgroundImage: `url("${thumb}")` } : undefined}
            >
              <PeIcon name="play" />
            </span>
            {/* What the link is: its title and who made it, once the preview
                is in; until then, the link itself. */}
            <span className="sb-pe-link-check-text">
              <span className="sb-pe-link-check-title" dir="auto">
                {(isVideo && item.preview?.title) || trimmed}
              </span>
              {isVideo && item.preview?.author ? (
                <span className="sb-pe-link-check-url" dir="auto">
                  {item.preview.author}
                </span>
              ) : null}
            </span>
          </div>
        ) : trimmed ? (
          <p className="sb-pe-error" role="alert">
            {kind === "video"
              ? t("playlist-editor-video-link-invalid", {
                  defaultValue: "That isn't a YouTube or Vimeo link.",
                })
              : t("playlist-editor-link-invalid", {
                  defaultValue: "That isn't a web address.",
                })}
          </p>
        ) : null}
      </Field>
    </>
  );
}

/** A passage's text, loaded from the Bible, or null while it loads. */
function usePassageText(
  ref: VerseRef | null,
  translationId: string | undefined,
  loadChapter: ScriptureChapterLoader | undefined
): string | null | "error" {
  const [text, setText] = useState<string | null | "error">(null);
  const key = ref ? JSON.stringify([ref, translationId ?? null]) : null;
  useEffect(() => {
    if (!ref || !loadChapter) {
      setText(null);
      return;
    }
    let cancelled = false;
    setText(null);
    loadChapter(translationId, ref.bookId, ref.chapter)
      .then((chapter) => {
        if (!cancelled) {
          setText(
            passageVerses(chapter, ref)
              .map((verse) => verse.text)
              .join(" ")
          );
        }
      })
      .catch(() => {
        if (!cancelled) setText("error");
      });
    return () => {
      cancelled = true;
    };
    // `key` stands for `ref` and `translationId`, which are new objects on
    // every render.
  }, [key, loadChapter]);
  return text;
}

/**
 * The reference typed, when it names a real book. The parser takes any word
 * for a book ("Nowhere 99"), and a step can't point at a book that isn't
 * there. Any book of the Bible counts — the step may be read in another
 * translation — as does one only the current translation has.
 */
function parsePassage(
  text: string,
  books: TranslationBook[]
): ReturnType<typeof parseVerseReference> {
  const ref = text.trim() ? parseVerseReference(text, books) : null;
  if (!ref) {
    return null;
  }
  const known =
    canonicalBookIndex(ref.book) !== Number.MAX_SAFE_INTEGER ||
    books.some((book) => book.id === ref.book);
  return known ? ref : null;
}

function PassageField(props: {
  ctx: StepCardContext;
  id: string;
  label: string;
  value: VerseRef;
  translationId?: string;
  onChange: (ref: VerseRef) => void;
}) {
  const { ctx, value } = props;
  const { t } = useI18n();
  const [text, setText] = useState(() =>
    formatVerseRef(value, ctx.resolveBookName)
  );
  const parsed = parsePassage(text, ctx.books);
  const passage = usePassageText(value, props.translationId, ctx.loadChapter);

  return (
    <Field
      label={props.label}
      hint={t("playlist-editor-type-reference", {
        defaultValue: "Type a reference",
      })}
      htmlFor={props.id}
    >
      <input
        id={props.id}
        className={`sb-pe-input${text.trim() && !parsed ? " sb-pe-input--invalid" : ""}`}
        type="text"
        dir="auto"
        value={text}
        placeholder={t("playlist-editor-verse-placeholder", {
          defaultValue: "e.g. John 3:16",
        })}
        onInput={(event) => {
          const next = event.currentTarget.value;
          setText(next);
          const ref = parsePassage(next, ctx.books);
          if (ref) {
            props.onChange({
              bookId: ref.book,
              chapter: ref.chapter,
              ...(ref.verse != null ? { verse: ref.verse } : {}),
              ...(ref.endChapter != null && ref.endChapter !== ref.chapter
                ? { endChapter: ref.endChapter }
                : {}),
              ...(ref.endVerse != null ? { endVerse: ref.endVerse } : {}),
            });
          }
        }}
      />
      <p className="sb-pe-passage" dir="auto">
        {passage === "error"
          ? t("playlist-editor-passage-failed", {
              defaultValue: "This passage couldn't be loaded.",
            })
          : (passage ??
            t("playlist-editor-passage-loading", {
              reference: formatVerseRef(value, ctx.resolveBookName),
              defaultValue: "Text for {{reference}} loads from the Bible.",
            }))}
      </p>
    </Field>
  );
}

function CompareCard(props: { ctx: StepCardContext; item: ScriptureItem }) {
  const { ctx, item } = props;
  const { t } = useI18n();
  const compare = item.compare ?? { ref: item.ref };
  const layout: CompareLayout = compare.layout ?? "side-by-side";
  const [notice, setNotice] = useState(() => questionFromHtml(item.note ?? ""));
  const update = (changes: Partial<ScriptureItem>) =>
    ctx.playlists.updateEditingPlaylistItem(ctx.index, { ...item, ...changes });
  const noticeId = `sb-pe-notice-${ctx.index}`;

  return (
    <>
      <TitleField
        id={`sb-pe-title-${ctx.index}`}
        value={item.noteTitle ?? ""}
        t={t}
        onInput={(value) => update({ noteTitle: value || undefined })}
      />
      <PassageField
        ctx={ctx}
        id={`sb-pe-passage-a-${ctx.index}`}
        label={t("playlist-editor-passage-a", { defaultValue: "Passage A" })}
        value={item.ref}
        translationId={item.translationId}
        onChange={(ref) => update({ ref })}
      />
      <PassageField
        ctx={ctx}
        id={`sb-pe-passage-b-${ctx.index}`}
        label={t("playlist-editor-passage-b", { defaultValue: "Passage B" })}
        value={compare.ref}
        translationId={item.translationId}
        onChange={(ref) => update({ compare: { ...compare, ref } })}
      />
      <Field
        label={t("playlist-editor-what-to-notice", {
          defaultValue: "What to notice",
        })}
        hint={t("playlist-editor-what-to-notice-hint", {
          defaultValue: "Optional — guides the comparison",
        })}
        htmlFor={noticeId}
      >
        <textarea
          id={noticeId}
          className="sb-pe-textarea"
          dir="auto"
          rows={3}
          value={notice}
          placeholder={t("playlist-editor-what-to-notice-placeholder", {
            defaultValue: "e.g. Both begin “In the beginning” — what changes?",
          })}
          onInput={(event) => {
            const value = event.currentTarget.value;
            setNotice(value);
            update({ note: questionToHtml(value) || undefined });
          }}
        />
      </Field>
      <div className="sb-pe-field">
        <span className="sb-pe-field-label" id={`sb-pe-layout-${ctx.index}`}>
          {t("playlist-editor-layout", { defaultValue: "Layout for readers" })}
        </span>
        <div
          className="sb-pe-layouts"
          role="radiogroup"
          aria-labelledby={`sb-pe-layout-${ctx.index}`}
        >
          <button
            type="button"
            role="radio"
            aria-checked={layout === "side-by-side"}
            className="sb-pe-layout sb-pe-layout--side"
            onClick={() =>
              update({ compare: { ...compare, layout: "side-by-side" } })
            }
          >
            <span className="sb-pe-layout-glyph" aria-hidden="true">
              <span />
              <span />
            </span>
            {t("playlist-editor-side-by-side", {
              defaultValue: "Side by side",
            })}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={layout === "stacked"}
            className="sb-pe-layout sb-pe-layout--stacked"
            onClick={() =>
              update({ compare: { ...compare, layout: "stacked" } })
            }
          >
            <span className="sb-pe-layout-glyph" aria-hidden="true">
              <span />
              <span />
            </span>
            {t("playlist-editor-stacked", { defaultValue: "Stacked" })}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * The open step when it isn't plain scripture: a card of its fields where the
 * chapter would be.
 */
export function PlaylistStepCard(props: {
  ctx: StepCardContext;
  item: PlaylistItemData;
}) {
  const { ctx, item } = props;
  const { t } = useI18n();
  const kind = playlistStepKind(item);

  let body: ComponentChildren = null;
  if (item.type === "html") {
    body =
      kind === "question" ? (
        <QuestionCard ctx={ctx} item={item} />
      ) : (
        <NoteCard ctx={ctx} item={item} />
      );
  } else if (item.type === "link") {
    body = <LinkCard ctx={ctx} item={item} />;
  } else {
    body = <CompareCard ctx={ctx} item={item} />;
  }

  return (
    <section
      className="sb-pe-card sb-pe-card--plain"
      aria-label={t("playlist-editor-step-number", {
        step: ctx.index + 1,
        defaultValue: "Step {{step}}",
      })}
    >
      <Eyebrow index={ctx.index} item={item} />
      {body}
    </section>
  );
}
