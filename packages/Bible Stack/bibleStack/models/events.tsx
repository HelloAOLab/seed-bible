import type { DraggingEvent, DropEvent } from "bibleVizUtils.models.casualos";
import type {
  BookBot,
  ChapterBot,
  ChunkOfVersesBot,
  CoverBot,
  CrossLineBot,
  SectionBot,
  TestamentBot,
  VerseBot,
} from "bibleStack.models.stack";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";

export interface BibleStackEvents {
  OnTestamentClick: {
    testament: TestamentBot;
    typeOfInteraction:
      | (typeof CanvasInteractions)["Tap"]
      | (typeof CanvasInteractions)["Click"];
  };
  OnTestamentDrag: {
    testament: TestamentBot;
    draggingEvent: DraggingEvent;
  };
  OnTestamentDragging: {
    testament: TestamentBot;
    draggingEvent: DraggingEvent;
  };
  OnTestamentDrop: {
    testament: TestamentBot;
    dropEvent: DropEvent;
  };
  OnTestamentPointerEnter: {
    testament: TestamentBot;
  };
  OnTestamentPointerUp: {
    testament: TestamentBot;
  };
  OnSectionClick: {
    section: SectionBot;
    typeOfInteraction:
      | (typeof CanvasInteractions)["Tap"]
      | (typeof CanvasInteractions)["Click"];
  };
  OnSectionDrag: {
    section: SectionBot;
    draggingEvent: DraggingEvent;
  };
  OnSectionDragging: {
    section: SectionBot;
    draggingEvent: DraggingEvent;
  };
  OnSectionDrop: {
    section: SectionBot;
    dropEvent: DropEvent;
  };
  OnSectionPointerEnter: {
    section: SectionBot;
  };
  OnSectionPointerExit: {
    section: SectionBot;
  };
  OnSectionPointerUp: {
    section: SectionBot;
  };
  OnBookClick: {
    book: BookBot;
    typeOfInteraction:
      | (typeof CanvasInteractions)["Tap"]
      | (typeof CanvasInteractions)["Click"];
  };
  OnBookDrag: {
    book: BookBot;
    draggingEvent: DraggingEvent;
  };
  OnBookDragging: {
    book: BookBot;
    draggingEvent: DraggingEvent;
  };
  OnBookDrop: {
    book: BookBot;
    dropEvent: DropEvent;
  };
  OnBookPointerEnter: {
    book: BookBot;
  };
  OnBookPointerExit: {
    book: BookBot;
  };
  OnBookPointerUp: {
    book: BookBot;
  };
  OnChapterClick: {
    chapter: ChapterBot;
  };
  OnChapterDrag: {
    chapter: ChapterBot;
    draggingEvent: DraggingEvent;
  };
  OnChapterDragging: {
    chapter: ChapterBot;
    draggingEvent: DraggingEvent;
  };
  OnChapterDrop: {
    chapter: ChapterBot;
    dropEvent: DropEvent;
  };
  OnChapterPointerEnter: {
    chapter: ChapterBot;
  };
  OnChapterPointerExit: {
    chapter: ChapterBot;
  };

  OnChunkOfVersesClick: {
    chunkOfVerses: ChunkOfVersesBot;
  };
  OnChunkOfVersesPointerEnter: {
    chunkOfVerses: ChunkOfVersesBot;
  };
  OnChunkOfVersesPointerExit: {
    chunkOfVerses: ChunkOfVersesBot;
  };
  OnCoverClick: {
    cover: CoverBot;
  };
  OnCrossLinePointerUp: {
    crossLine: CrossLineBot;
  };
  OnCrossLinePointerDown: {
    crossLine: CrossLineBot;
  };
  OnVerseClick: {
    verse: VerseBot;
  };
}

export type BibleStackEvent = keyof BibleStackEvents;
