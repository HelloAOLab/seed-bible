import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type {
  PlaylistItemData,
  PlaylistManager,
} from "../../managers/PlaylistManager";
import { resolveLinkMedia } from "../../managers/resolveLinkMedia";
import { safeImageUrl } from "../../managers/linkPreview";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { PeIcon } from "./editorControls";
import { PlaylistNoteComposer } from "./PlaylistNoteComposer";
import { playlistStepKind, playlistStepKindName } from "./playlistSteps";

type Translate = ReturnType<typeof useI18n>["t"];
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
  hint?: string;
}) {
  const { t } = props;
  return (
    <Field
      label={t("playlist-editor-title", { defaultValue: "Title" })}
      hint={
        props.hint ??
        t("playlist-editor-title-hint", {
          defaultValue: "Optional — a short heading",
        })
      }
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
  const update = (changes: Partial<HtmlItem>) =>
    ctx.playlists.updateEditingPlaylistItem(ctx.index, { ...item, ...changes });
  const optional = t("playlist-editor-optional", { defaultValue: "Optional" });

  return (
    <>
      <TitleField
        id={`sb-pe-title-${ctx.index}`}
        value={item.title ?? ""}
        t={t}
        hint={optional}
        placeholder={t("playlist-editor-question-title-placeholder", {
          defaultValue: "e.g. Light in the dark",
        })}
        onInput={(value) => update({ title: value || undefined })}
      />
      <Field label={t("playlist-step-question", { defaultValue: "Question" })}>
        <PlaylistNoteComposer
          boxed
          formatting
          initialHtml={item.html}
          placeholder={t("playlist-editor-question-placeholder", {
            defaultValue: "e.g. What does light reveal in your life this week?",
          })}
          steps={[]}
          onChange={(html) => update({ html })}
        />
      </Field>
      <Field
        label={t("playlist-editor-reader-hint", {
          defaultValue: "Hint for readers",
        })}
        hint={optional}
      >
        <PlaylistNoteComposer
          boxed
          formatting
          initialHtml={item.question?.hint ?? ""}
          placeholder={t("playlist-editor-reader-hint-placeholder", {
            defaultValue: "e.g. Think about a moment this week",
          })}
          steps={[]}
          onChange={(html) =>
            update({ question: { ...item.question, hint: html || undefined } })
          }
        />
      </Field>
      <Field
        label={t("playlist-editor-answer", { defaultValue: "Answer" })}
        hint={optional}
      >
        <PlaylistNoteComposer
          boxed
          formatting
          initialHtml={item.question?.answer ?? ""}
          placeholder={t("playlist-editor-answer-placeholder", {
            defaultValue: "e.g. In the way He provides, even in small things",
          })}
          steps={[]}
          onChange={(html) =>
            update({
              question: { ...item.question, answer: html || undefined },
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
