import {
  batch,
  computed,
  effect,
  signal,
  untracked,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import {
  PlaylistItem,
  type NewPlaylistStepKind,
  type PlaylistItemData,
  type VerseRef,
} from "./PlaylistManager";
import type { ReaderTab } from "./TabsManager";

/** Asks the user for a chapter; see `StepEditorSource.pickChapter`. */
export type ChapterPicker = (
  onPick: (bookId: string, chapter: number) => void,
  /** The book to start in, when it isn't the one being read. */
  bookId?: string
) => void;

/** The draft a step editor edits: its steps, and how to change them. */
export interface StepEditorSource {
  /** The steps of the open draft; empty while none is open. */
  items: ReadonlySignal<readonly PlaylistItemData[]>;
  /**
   * Inserts a step at `index`, beside the one at `besideIndex` when that
   * matters and is known. False when there was nowhere to put it.
   */
  insertItem: (
    index: number,
    item: PlaylistItemData,
    besideIndex?: number
  ) => boolean;
  updateItem: (index: number, item: PlaylistItemData) => void;
  removeItem: (index: number) => void;
  /**
   * The step a new one goes after (-1 puts it first), given the open one (-1
   * for none). The open one, else the last, when omitted.
   */
  addAfterIndex?: (openIndex: number) => number;
  /**
   * Asks the user for a chapter (the reader's book selector), calling
   * `onPick` with the one they choose. Nothing is called if they back out.
   * Omitted means new scripture steps start on the chapter being read.
   */
  pickChapter?: ChapterPicker;
}

/**
 * The step editor's state: which step of a draft is open over the reader, and
 * the menus and sheets around it. Playlists and reading plans are both edited
 * as a list of steps, so both managers build their editor on this.
 */
export interface StepEditor {
  items: ReadonlySignal<readonly PlaylistItemData[]>;
  /**
   * The open step, as an index into the draft; -1 for none, which is the
   * editor's list of steps. The editor opens on that list, and a step opened
   * from it is a page of its own that Back returns from.
   */
  stepIndex: Signal<number>;
  /**
   * The open "Add a step" menu and the step new ones go after (-1 puts them
   * first), or null while it's closed.
   */
  addMenu: Signal<{ afterIndex: number } | null>;
  /** The scripture step whose verses are being re-picked in the reader. */
  versePickIndex: Signal<number | null>;
  /**
   * The verses picked in the reader for the step in `versePickIndex`, as the
   * reference Apply would give it, or null before any are picked.
   */
  versePickRef: ReadonlySignal<VerseRef | null>;
  /**
   * The chapter the reader has moved to, by its own navigation, when it isn't
   * the open scripture step's: the chapter Apply would give the step. Null
   * while the reader is on the step's passage (any chapter of a range running
   * across chapters), or while verses are being picked.
   */
  chapterChange: ReadonlySignal<{ bookId: string; chapter: number } | null>;
  /** Whether the sheet or dialog for the draft's own details is open. */
  detailsOpen: Signal<boolean>;
  /** Phone only: whether the sheet for the open step's settings is open. */
  settingsOpen: Signal<boolean>;
  /** Opens a step in the editor, ending any verse pick in progress. */
  selectStep: (index: number) => void;
  /** Opens the "Add a step" menu, placing new steps after the open one. */
  openAddMenu: () => void;
  /**
   * Adds a new step of the given kind after `afterIndex` and opens it. A
   * scripture step covers a whole chapter, which the user picks in the book
   * selector first; no step is added if they back out of it.
   */
  addStep: (kind: NewPlaylistStepKind, afterIndex: number) => void;
  updateItem: (index: number, item: PlaylistItemData) => void;
  removeItem: (index: number) => void;
  /** Inserts a copy of a step right after it and opens the copy. */
  duplicateItem: (index: number) => boolean;
  /** Points the open scripture step at the whole chapter the reader is on. */
  applyChapterChange: () => void;
  /** Gives the step being picked the verses picked in the reader. */
  applyVersePick: () => void;
  /**
   * Asks for a new chapter for one of the compare step at `index`'s passages
   * (the reader's book selector), pointing that passage at the whole chapter
   * picked. Nothing changes if the user backs out.
   */
  pickComparePassage: (index: number, passage: "first" | "second") => void;
  /**
   * The steps that can't be saved as they are (a video step with no link,
   * say), by index. A draft saved with one would fail to load.
   */
  invalidSteps: () => number[];
  /** Puts the editor back on its list, with nothing open over it. */
  reset: () => void;
  /**
   * Set for the editor's next URL write when it shouldn't cost a Back entry:
   * the open step moving because steps were added or removed around it, or the
   * URL being brought in line with what it already asked for.
   */
  replaceNextUrlWrite: () => void;
  /** Whether the next URL write should replace (see `replaceNextUrlWrite`). */
  replacesUrlWrite: () => boolean;
}

/** Whether a step can be saved as it is, rather than needing finishing. */
export function isFinishedStep(item: PlaylistItemData): boolean {
  return PlaylistItem.safeParse(item).success;
}

export function createStepEditor(
  activeTab: ReadonlySignal<ReaderTab | null>,
  source: StepEditorSource
): StepEditor {
  const { items, insertItem, updateItem, removeItem } = source;

  const stepIndex = signal(-1);
  const addMenu = signal<{ afterIndex: number } | null>(null);
  const versePickIndex = signal<number | null>(null);
  const detailsOpen = signal(false);
  const settingsOpen = signal(false);

  let replaceUrlWrite = false;
  const replaceNextUrlWrite = () => {
    replaceUrlWrite = true;
    queueMicrotask(() => {
      replaceUrlWrite = false;
    });
  };

  const reset = () => {
    batch(() => {
      stepIndex.value = -1;
      addMenu.value = null;
      versePickIndex.value = null;
      detailsOpen.value = false;
      settingsOpen.value = false;
    });
  };

  /** The open step when it's scripture shown over the reader, or null. */
  const peekScriptureStep = () => {
    const item = items.peek()[stepIndex.peek()];
    // A compare step is edited in its own editor, not over the reader.
    return item?.type === "bible-verse" && !item.compare ? item : null;
  };

  /**
   * The open step while it's scripture, as a key that only changes when the
   * passage the reader should show does — typing a note into the step leaves
   * it alone, so the reader isn't sent back to the passage on every keystroke.
   */
  const scriptureKey = computed<string | null>(() => {
    const tab = activeTab.value;
    const item = items.value[stepIndex.value];
    if (!tab || item?.type !== "bible-verse" || item.compare) {
      return null;
    }
    return JSON.stringify([tab.id, item.ref, item.translationId ?? null]);
  });

  let decoration: { tab: ReaderTab; id: string } | null = null;
  let navigationCount = 0;
  /**
   * True while the editor itself is taking the reader to the open step's
   * passage, so that trip isn't taken for the reader moving elsewhere.
   */
  const navigating = signal(false);
  const clearDecoration = () => {
    if (decoration) {
      decoration.tab.readingState.removeDecoration(decoration.id);
      decoration = null;
    }
  };

  // Opens the open scripture step's chapter in the selected tab and
  // highlights its verses, dimming the rest of the chapter around them.
  effect(() => {
    const key = scriptureKey.value;
    const navigation = ++navigationCount;
    untracked(() => {
      clearDecoration();
      const tab = activeTab.peek();
      const item = peekScriptureStep();
      if (!key || !tab || !item) {
        navigating.value = false;
        return;
      }
      const { ref } = item;
      navigating.value = true;
      void (async () => {
        try {
          await tab.readingState.selectTranslationAndChapter(
            item.translationId ?? tab.readingState.translationId.peek(),
            ref.bookId,
            ref.chapter,
            {
              ...(ref.verse != null ? { scrollToVerse: ref.verse } : {}),
              // Opening the step already made its history entry (its place
              // in the URL); the reader moving to it belongs to that entry.
              replace: true,
            }
          );
        } finally {
          if (navigation === navigationCount) {
            navigating.value = false;
          }
        }
        if (navigation !== navigationCount || ref.verse == null) {
          return;
        }
        // A range running into later chapters is highlighted through the end
        // of the one on screen.
        const lastVerse =
          ref.endChapter != null && ref.endChapter > ref.chapter
            ? (tab.readingState.chapterData.peek()?.numberOfVerses ?? ref.verse)
            : (ref.endVerse ?? ref.verse);
        const verses: number[] = [];
        for (let verse = ref.verse; verse <= lastVerse; verse++) {
          verses.push(verse);
        }
        decoration = {
          tab,
          // The reader's usual diminish (as when playback shows a passage):
          // the rest of the chapter fades, with no fill behind the passage.
          // The editor's own classes ride along for its layout.
          id: tab.readingState.decorateVerses(ref.bookId, ref.chapter, verses, {
            className:
              "sb-verse-decoration-diminish sb-playlist-editor-step-verse",
            containerClassName:
              "sb-chapter-decoration-diminish sb-playlist-editor-step-chapter",
            localOnly: true,
          }),
        };
      })();
    });
  });

  const chapterChange = computed<{
    bookId: string;
    chapter: number;
  } | null>(() => {
    if (navigating.value || versePickIndex.value !== null) {
      return null;
    }
    const item = items.value[stepIndex.value];
    if (item?.type !== "bible-verse" || item.compare) {
      return null;
    }
    const readingState = activeTab.value?.readingState;
    const bookId = readingState?.bookId.value;
    const chapter = readingState?.chapterNumber.value;
    if (!bookId || !chapter) {
      return null;
    }
    const { ref } = item;
    const lastChapter = Math.max(ref.endChapter ?? ref.chapter, ref.chapter);
    if (
      bookId === ref.bookId &&
      chapter >= ref.chapter &&
      chapter <= lastChapter
    ) {
      return null;
    }
    return { bookId, chapter };
  });

  const applyChapterChange = (): void => {
    const change = chapterChange.peek();
    const index = stepIndex.peek();
    const item = items.peek()[index];
    if (!change || item?.type !== "bible-verse") {
      return;
    }
    updateItem(index, {
      ...item,
      ref: { bookId: change.bookId, chapter: change.chapter },
    });
  };

  const versePickRef = computed<VerseRef | null>(() => {
    if (versePickIndex.value === null) {
      return null;
    }
    const selected = activeTab.value?.readingState.selectedVerses.value ?? [];
    const first = selected[0];
    if (!first) {
      return null;
    }
    const numbers = selected
      .filter(
        (s) =>
          s.bookId === first.bookId && s.chapterNumber === first.chapterNumber
      )
      .map((s) => s.verse.number)
      .sort((a, b) => a - b);
    const start = numbers[0]!;
    const end = numbers[numbers.length - 1]!;
    return {
      bookId: first.bookId,
      chapter: first.chapterNumber,
      verse: start,
      ...(end > start ? { endVerse: end } : {}),
    };
  });

  // Picking verses in the reader while a scripture step is open is how its
  // passage is changed: the first verse picked starts it, and Apply in the
  // pick bar ends it, as does deselecting every verse.
  effect(() => {
    const selected =
      activeTab.value?.readingState.selectedVerses.value.length ?? 0;
    untracked(() => {
      if (selected === 0) {
        if (versePickIndex.peek() !== null) {
          versePickIndex.value = null;
        }
        return;
      }
      if (peekScriptureStep() && versePickIndex.peek() === null) {
        versePickIndex.value = stepIndex.peek();
      }
    });
  });

  const applyVersePick = (): void => {
    const index = versePickIndex.peek();
    const ref = versePickRef.peek();
    const item = index === null ? undefined : items.peek()[index];
    batch(() => {
      if (index !== null && ref && item?.type === "bible-verse") {
        updateItem(index, { ...item, ref });
      }
      versePickIndex.value = null;
    });
    activeTab.peek()?.readingState.clearSelectedVerses();
  };

  const selectStep = (index: number): void => {
    if (index < -1 || index >= items.peek().length) {
      return;
    }
    batch(() => {
      stepIndex.value = index;
      versePickIndex.value = null;
      settingsOpen.value = false;
    });
  };

  const duplicateItem = (index: number): boolean => {
    const item = items.peek()[index];
    if (!item) {
      return false;
    }
    const copy = JSON.parse(JSON.stringify(item)) as PlaylistItemData;
    if (!insertItem(index + 1, copy, index)) {
      return false;
    }
    selectStep(index + 1);
    return true;
  };

  /** Inserts a new step after `afterIndex` and opens it. */
  const insertStep = (item: PlaylistItemData, afterIndex: number) => {
    const index = Math.max(0, Math.min(afterIndex + 1, items.peek().length));
    batch(() => {
      if (!insertItem(index, item)) {
        return;
      }
      addMenu.value = null;
      selectStep(index);
    });
  };

  const openAddMenu = () => {
    const open = stepIndex.peek();
    addMenu.value = {
      afterIndex:
        source.addAfterIndex?.(open) ??
        (open >= 0 ? open : items.peek().length - 1),
    };
  };

  const addStep = (kind: NewPlaylistStepKind, afterIndex: number) => {
    const chapter = activeTab.peek()?.readingState.chapterData.peek();
    const bookId = chapter?.book.id ?? "GEN";
    const chapterNumber = chapter?.chapter.number ?? 1;
    if (kind === "scripture") {
      const addChapter = (pickedBookId: string, pickedChapter: number) =>
        insertStep(
          {
            type: "bible-verse",
            ref: { bookId: pickedBookId, chapter: pickedChapter },
          },
          afterIndex
        );
      if (!source.pickChapter) {
        addChapter(bookId, chapterNumber);
        return;
      }
      addMenu.value = null;
      source.pickChapter(addChapter);
      return;
    }
    const item: PlaylistItemData =
      kind === "compare"
        ? {
            type: "bible-verse",
            ref: { bookId, chapter: chapterNumber },
            compare: { ref: { bookId, chapter: chapterNumber } },
          }
        : kind === "question"
          ? { type: "html", html: "", question: {} }
          : kind === "video" || kind === "link"
            ? // The same step, offered under both names: a link to a video
              // plays, any other opens. An empty link isn't a valid step; the
              // card asks for one and saving refuses until it has it.
              { type: "link", url: "", embed: true }
            : { type: "html", html: "" };
    insertStep(item, afterIndex);
  };

  const pickComparePassage = (
    index: number,
    passage: "first" | "second"
  ): void => {
    const current = items.peek()[index];
    if (current?.type !== "bible-verse" || !current.compare) {
      return;
    }
    const from = passage === "first" ? current.ref : current.compare.ref;
    source.pickChapter?.((bookId, chapter) => {
      const item = items.peek()[index];
      if (item?.type !== "bible-verse" || !item.compare) {
        return;
      }
      const ref = { bookId, chapter };
      updateItem(
        index,
        passage === "first"
          ? { ...item, ref }
          : { ...item, compare: { ...item.compare, ref } }
      );
    }, from.bookId);
  };

  const invalidSteps = (): number[] =>
    items
      .peek()
      .flatMap((item, index) => (isFinishedStep(item) ? [] : [index]));

  return {
    items,
    stepIndex,
    addMenu,
    versePickIndex,
    versePickRef,
    chapterChange,
    detailsOpen,
    settingsOpen,
    selectStep,
    openAddMenu,
    addStep,
    updateItem,
    removeItem,
    duplicateItem,
    applyChapterChange,
    applyVersePick,
    pickComparePassage,
    invalidSteps,
    reset,
    replaceNextUrlWrite,
    replacesUrlWrite: () => replaceUrlWrite,
  };
}
