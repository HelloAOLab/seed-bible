import type { useI18n } from "../../i18n/I18nManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import { verseRefLabel } from "../playlistItemLabel";

/** One line of the "Before you publish" list: something right, or to look at. */
export interface PublishCheck {
  ok: boolean;
  message: string;
  /** The item the note is about, so the editor can open it. Absent for the playlist as a whole. */
  itemIndex?: number;
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

/**
 * What to look at before publishing: whether every passage is in the
 * translation being read, whether two steps in a row show the same passage,
 * whether a scene has nothing in it, and how much the playlist holds. Each
 * line is either reassurance or a pointer, never a blocker.
 */
export function publishChecks(
  items: PlaylistItemData[],
  books: TranslationBook[],
  t: ReturnType<typeof useI18n>["t"],
  resolveBookName: (bookId: string) => string
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
        message: t("publish-check-passages-found", {
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
        message: t("publish-check-repeated-passage", {
          defaultValue: "Steps {{first}} and {{second}} show the same passage.",
          first: stepNumber(items, previous.index),
          second: stepNumber(items, current.index),
        }),
      });
    }
    previous = current;
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

  const questions = items.filter((item) => item.type === "question").length;
  const notes = items.filter(
    (item) => item.type === "bible-verse" && (item.note || item.noteTitle)
  ).length;
  if (questions > 0 || notes > 0) {
    checks.push({
      ok: true,
      message: t("publish-check-notes-and-questions", {
        defaultValue: "{{notes}} notes, {{questions}} questions",
        notes,
        questions,
      }),
    });
  }

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
