import type { useI18n } from "../../i18n/I18nManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import { resolveLinkMedia } from "../../managers/resolveLinkMedia";
import { verseRefLabel } from "../playlistItemLabel";

/** One line of the "Before you publish" list: something right, or to look at. */
export interface PublishCheck {
  ok: boolean;
  message: string;
  /** The item the note is about, so the editor can open it. Absent for the playlist as a whole. */
  itemIndex?: number;
  /** What pressing the pointer does, when it is more than opening the step. */
  action?: string;
}

function sameRef(a: VerseRef, b: VerseRef): boolean {
  return (
    a.bookId === b.bookId &&
    a.chapter === b.chapter &&
    (a.verse ?? null) === (b.verse ?? null) &&
    (a.endVerse ?? null) === (b.endVerse ?? null) &&
    (a.endChapter ?? null) === (b.endChapter ?? null)
  );
}

/** How many phrases of a note link to a verse (see `VerseLinkMark`). */
function verseLinkCount(html: string | undefined): number {
  return html ? (html.match(/class="sb-verse-link"/g) ?? []).length : 0;
}

/**
 * What to look at before publishing: whether every passage is in the
 * translation being read, whether two steps in a row show the same passage,
 * whether a scene has nothing in it, whether a video has a transcript, and
 * how much the playlist holds. Each line is either reassurance or a
 * pointer, never a blocker.
 */
export function publishChecks(
  items: PlaylistItemData[],
  books: TranslationBook[],
  t: ReturnType<typeof useI18n>["t"],
  resolveBookName: (bookId: string) => string,
  options: { translationName?: string } = {}
): PublishCheck[] {
  const checks: PublishCheck[] = [];
  const steps = items.filter((item) => item.type !== "scene");

  if (steps.length === 0) {
    checks.push({
      ok: false,
      message: t("publish-check-no-steps", {
        defaultValue: "Add at least one step before publishing.",
      }),
    });
    return checks;
  }

  // Passages the translation can't show.
  const missing: { index: number; ref: VerseRef }[] = [];
  items.forEach((item, index) => {
    const refs =
      item.type === "bible-verse"
        ? [item.ref, ...(item.refs ?? [])]
        : item.type === "compare"
          ? item.refs
          : [];
    for (const ref of refs) {
      const book = books.find((candidate) => candidate.id === ref.bookId);
      const lastChapter = ref.endChapter ?? ref.chapter;
      if (!book || lastChapter > book.numberOfChapters) {
        missing.push({ index, ref });
      }
    }
  });
  if (books.length > 0) {
    if (missing.length === 0) {
      checks.push({
        ok: true,
        message: options.translationName
          ? t("publish-check-passages-found-in", {
              defaultValue: "All passages found in {{translation}}",
              translation: options.translationName,
            })
          : t("publish-check-passages-found", {
              defaultValue: "All passages found in this translation",
            }),
      });
    } else {
      for (const entry of missing) {
        checks.push({
          ok: false,
          itemIndex: entry.index,
          message: t("publish-check-passage-missing", {
            defaultValue: "{{passage}} isn't in this translation.",
            passage: verseRefLabel(entry.ref, resolveBookName),
          }),
        });
      }
    }
  }

  // What the playlist holds: phrases linked to verses, notes and questions.
  const linkedPhrases = items.reduce(
    (sum, item) =>
      sum +
      (item.type === "bible-verse"
        ? verseLinkCount(item.note) + (item.highlights?.length ?? 0)
        : item.type === "html"
          ? verseLinkCount(item.html)
          : 0),
    0
  );
  const questions = items.filter(
    (item) =>
      item.type === "question" ||
      (item.type === "bible-verse" && !!item.question)
  ).length;
  const notes = items.filter(
    (item) => item.type === "bible-verse" && (item.note || item.noteTitle)
  ).length;
  const held = [
    linkedPhrases > 0
      ? t("publish-check-linked-phrases", {
          defaultValue: "{{count}} linked phrases",
          count: linkedPhrases,
        })
      : null,
    notes > 0
      ? t("publish-check-notes", {
          defaultValue: "{{count}} notes",
          count: notes,
        })
      : null,
    questions > 0
      ? t("publish-check-questions", {
          defaultValue: "{{count}} questions",
          count: questions,
        })
      : null,
  ].filter(Boolean);
  if (held.length > 0) {
    checks.push({ ok: true, message: held.join(", ") });
  }

  // The same passage twice in a row.
  let previous: { index: number; ref: VerseRef } | null = null;
  items.forEach((item, index) => {
    if (item.type === "scene") {
      return;
    }
    const current =
      item.type === "bible-verse" ? { index, ref: item.ref } : null;
    if (current && previous && sameRef(current.ref, previous.ref)) {
      checks.push({
        ok: false,
        itemIndex: current.index,
        action: t("playlist-review-fix", { defaultValue: "Fix" }),
        message: t("publish-check-repeated-passage", {
          defaultValue: "Steps {{first}} and {{second}} show the same passage.",
          first: stepNumber(items, previous.index),
          second: stepNumber(items, current.index),
        }),
      });
    }
    previous = current;
  });

  // Videos nobody can read.
  items.forEach((item, index) => {
    if (
      item.type === "link" &&
      resolveLinkMedia(item.url).kind !== "link" &&
      !item.transcript?.trim()
    ) {
      checks.push({
        ok: false,
        itemIndex: index,
        action: t("publish-check-add-transcript", {
          defaultValue: "Add one",
        }),
        message: t("publish-check-video-transcript", {
          defaultValue: "Video in step {{step}} has no transcript.",
          step: stepNumber(items, index),
        }),
      });
    }
  });

  // Scenes with nothing under them.
  items.forEach((item, index) => {
    if (item.type !== "scene") {
      return;
    }
    const next = items[index + 1];
    if (!next || next.type === "scene") {
      checks.push({
        ok: false,
        itemIndex: index,
        message: t("publish-check-empty-scene", {
          defaultValue: "The scene “{{title}}” has no steps in it.",
          title: item.title,
        }),
      });
    }
  });

  return checks;
}

/** The 1-based step number of `index`, counting every item but scenes. */
function stepNumber(items: PlaylistItemData[], index: number): number {
  let step = 0;
  for (let i = 0; i <= index; i += 1) {
    if (items[i]?.type !== "scene") {
      step += 1;
    }
  }
  return step;
}
