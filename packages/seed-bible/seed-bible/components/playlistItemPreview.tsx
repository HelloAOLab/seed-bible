import type { useI18n } from "../i18n/I18nManager";
import type { ModalManager } from "../managers/ModalManager";
import type {
  PlayingState,
  PlaylistItemData,
  VerseRef,
} from "../managers/PlaylistManager";
import { PlaylistHtmlContent } from "./PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistLinkContent } from "./PlaylistLinkContent/PlaylistLinkContent";
import { PlaylistItemNav } from "./PlaylistItemNav/PlaylistItemNav";
import {
  CompareStepContent,
  QuestionStepContent,
  type QuestionResponseVisibility,
} from "./PlaylistStepContent/PlaylistStepContent";
import type { ScriptureChapterLoader } from "./PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { playlistItemLabel } from "./playlistItemLabel";

/**
 * Whether an item has content of its own to preview. Scripture is read in the
 * reader rather than previewed, and a scene is a heading, so text, links,
 * questions and comparisons qualify.
 */
export function canPreviewPlaylistItem(item: PlaylistItemData): boolean {
  return item.type !== "bible-verse" && item.type !== "scene";
}

/** What the question and compare steps need from the app beyond the item. */
export interface PlaylistItemPreviewOptions {
  /** Loads chapters for a comparison's passages. */
  loadChapter?: ScriptureChapterLoader;
  /** Book names for references; the raw id stands in otherwise. */
  resolveBookName?: (bookId: string) => string;
  /** Opens one of a comparison's passages in the reader. */
  onOpenPassage?: (ref: VerseRef) => void;
  /** Who wrote the playlist, for "{{author}} asks" on a question. */
  authorName?: string | null;
  /** Whether the reader is in a group session an answer could be shared with. */
  inSession?: boolean;
  /** The reader's earlier answer to this question, if any. */
  questionResponse?: { text: string; visibility: QuestionResponseVisibility };
  /** Saves the reader's answer to a question step. Without it, no save button. */
  onSaveQuestionResponse?: (
    text: string,
    visibility: QuestionResponseVisibility
  ) => Promise<void> | void;
}

/**
 * Opens a text, link, question or compare item in the app's generic modal: an
 * HTML snippet renders sanitized, a link renders as a video, an embed, or an
 * "Open" button depending on what its URL points at, a question shows its
 * prompt with a box to answer in, and a comparison its passages side by side.
 * Scripture items are ignored — they have no preview — and so are scenes.
 *
 * `modalId` is the caller's own, so a reading-plan preview can't close the
 * playlist playback modal (or the reverse) out from under the user.
 *
 * Pass `playing` when the item is a step of a playing playlist: the modal then
 * gets Previous / Next buttons that move through the queue, and closing it
 * (X or backdrop) moves on to the next item.
 *
 * Shared by playlist playback, the reading-plan wizard, and the plan detail
 * view so an item looks the same wherever it is previewed.
 */
export function openPlaylistItemPreview(
  modals: ModalManager,
  item: PlaylistItemData,
  modalId: string,
  t: ReturnType<typeof useI18n>["t"],
  playing?: PlayingState,
  options: PlaylistItemPreviewOptions = {}
): void {
  if (!canPreviewPlaylistItem(item)) {
    return;
  }
  const resolveBookName = options.resolveBookName ?? ((bookId) => bookId);
  const title =
    item.type === "question"
      ? item.title?.trim() ||
        t("playlist-item-question", { defaultValue: "Question" })
      : item.type === "compare"
        ? item.title?.trim() || playlistItemLabel(item, t, resolveBookName)
        : (item.type === "html" || item.type === "link"
            ? item.title?.trim()
            : undefined) ||
          (item.type === "link" ? item.preview?.title : undefined) ||
          t("content", { defaultValue: "Content" });
  modals.openModal({
    id: modalId,
    title,
    content: () =>
      item.type === "html" ? (
        <PlaylistHtmlContent html={item.html} />
      ) : item.type === "link" ? (
        <PlaylistLinkContent
          url={item.url}
          title={item.title}
          embed={item.embed}
          preview={item.preview}
        />
      ) : item.type === "question" ? (
        <QuestionStepContent
          item={item}
          authorName={options.authorName}
          initialResponse={options.questionResponse}
          inSession={options.inSession}
          onSave={options.onSaveQuestionResponse}
        />
      ) : item.type === "compare" ? (
        <CompareStepContent
          item={item}
          loadChapter={options.loadChapter}
          resolveBookName={resolveBookName}
          onOpenPassage={options.onOpenPassage}
          playing={playing}
        />
      ) : null,
    footer: playing ? () => <PlaylistItemNav playing={playing} /> : undefined,
    onDismiss: playing ? () => void playing.next() : undefined,
  });
}
