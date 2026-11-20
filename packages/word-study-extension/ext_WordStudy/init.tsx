import { computed } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import type { BibleToolContext } from "seed-bible/managers";
import { MaterialIcon } from "seed-bible/components";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  CHAPTER_INTERLINEAR_PANE_ID,
  chapterPositionOf,
  createChapterInterlinearState,
  createInterlinearLines,
  readerVerseOf,
  type ChapterInterlinearState,
  type InterlinearLines,
} from "./chapterInterlinear";
import {
  ChapterInterlinearPane,
  ChapterInterlinearTitle,
} from "./ChapterInterlinearPane";
import { createWordStudyProvider, type WordStudyProvider } from "./provider";
import {
  WordStudyPane,
  WordStudyPaneLeading,
  WordStudyPaneTitle,
} from "./WordStudyPane";
import {
  createWordStudyState,
  studiedVersesFromSelection,
  WORD_STUDY_PANE_ID,
  type WordStudyState,
} from "./wordStudyState";

export const WORD_STUDY_EXTENSION_ID = "word-study-extension";

function WordStudyIcon() {
  return <MaterialIcon>translate</MaterialIcon>;
}

/**
 * Opens the reader at a reference tapped in a definition. On a phone the pane
 * covers the reader, so it closes to reveal the passage; on a wider screen it
 * stays open beside it.
 */
function openReference(context: SeedBibleState, ref: VerseRef) {
  context.panes.closeFullscreenPanes();
  void context.app.openVerseReference(ref);
}

/** Freezes the selected verses and opens (or refreshes) the Word Study pane. */
export function openWordStudyPane(
  context: SeedBibleState,
  state: WordStudyState,
  provider: WordStudyProvider,
  toolContext: BibleToolContext
) {
  const selected = toolContext.readingState.selectedVerses.value;
  if (selected.length === 0) {
    return;
  }

  const books = toolContext.readingState.translationBooks.value?.books ?? [];
  state.verses.value = studiedVersesFromSelection(selected, (bookId) => {
    const book = books.find((entry) => entry.id === bookId);
    return book?.commonName || book?.name || bookId;
  });
  state.lexiconStack.value = [];

  context.panes.openPane({
    id: WORD_STUDY_PANE_ID,
    placement: "side",
    title: () => <WordStudyPaneTitle state={state} />,
    leading: () => <WordStudyPaneLeading state={state} />,
    icon: WordStudyIcon,
    component: () => (
      <WordStudyPane
        provider={provider}
        state={state}
        onReferenceClick={(ref) => openReference(context, ref)}
      />
    ),
    onClose: () => state.reset(),
  });
}

function InterlinearIcon() {
  return <MaterialIcon>auto_stories</MaterialIcon>;
}

/**
 * Opens the chapter interlinear on the reader's chapter, scrolled to where the
 * reader is. Closes it instead when it's already open, like a toggle.
 */
export function toggleChapterInterlinear(
  context: SeedBibleState,
  state: ChapterInterlinearState,
  provider: WordStudyProvider,
  lines: InterlinearLines
) {
  if (context.panes.closePane(CHAPTER_INTERLINEAR_PANE_ID)) {
    return;
  }

  const position = computed(() =>
    chapterPositionOf(context.app.currentReadingState.value)
  );
  state.lexiconStack.value = [];
  state.scrollToVerse.value = readerVerseOf(
    context.app.currentReadingState.peek()
  );

  context.panes.openPane({
    id: CHAPTER_INTERLINEAR_PANE_ID,
    placement: "side",
    title: () => <ChapterInterlinearTitle state={state} position={position} />,
    leading: () => <WordStudyPaneLeading state={state} />,
    icon: InterlinearIcon,
    component: () => (
      <ChapterInterlinearPane
        provider={provider}
        state={state}
        position={position}
        lines={lines}
        onReferenceClick={(ref) => openReference(context, ref)}
      />
    ),
    onClose: () => state.reset(),
  });
}

export default function initWordStudyExtension() {
  registerExtension({
    id: WORD_STUDY_EXTENSION_ID,
    init: function* (context: SeedBibleState) {
      const state = createWordStudyState();
      const chapterState = createChapterInterlinearState(state.order);
      const lines = createInterlinearLines(
        WORD_STUDY_EXTENSION_ID,
        context.extensionSettings
      );
      const provider = createWordStudyProvider(context.bibleData);

      yield context.tools.registerToolbarTool({
        id: "word-study-interlinear",
        // After Find the Verse (320).
        priority: 330,
        title: {
          key: "interlinear",
          defaultValue: "Interlinear",
          ns: "word-study-extension",
        },
        icon: InterlinearIcon,
        onSelect: () =>
          toggleChapterInterlinear(context, chapterState, provider, lines),
      });

      yield context.tools.registerVerseToolbarTool({
        id: "word-study",
        // Between Compare (250) and Share (300). "Cancel" is forced last by
        // the toolbar regardless of priority.
        priority: 275,
        showInEmbedded: true,
        title: {
          key: "word-study",
          defaultValue: "Word Study",
          ns: "word-study-extension",
        },
        icon: WordStudyIcon,
        isVisible: (toolContext) =>
          toolContext.readingState.selectedVerses.value.length > 0,
        onSelect: (toolContext) =>
          openWordStudyPane(context, state, provider, toolContext),
      });

      yield () => {
        context.panes.closePane(WORD_STUDY_PANE_ID);
        context.panes.closePane(CHAPTER_INTERLINEAR_PANE_ID);
        state.reset();
        chapterState.reset();
      };
    },
  });
}
