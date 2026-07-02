import type {
  DraggingEvent,
  DropEvent,
} from "bibleVizUtils.infrastructure.models.casualos";
import type {
  BookBot,
  ChapterBot,
  VersesBundleBot,
  CoverBot,
  CrossLineBot,
  SectionBot,
  TestamentBot,
  VerseBot,
} from "bibleStack.models.stack";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackTestamentData";
import type { AnyStackData } from "../../application/ports/pieces";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";

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
    chunkOfVerses: VersesBundleBot;
  };
  OnChunkOfVersesPointerEnter: {
    chunkOfVerses: VersesBundleBot;
  };
  OnChunkOfVersesPointerExit: {
    chunkOfVerses: VersesBundleBot;
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
  OnStackSequenceStart: void;
  OnStackSequenceEnd: void;
  OnBibleDelete: { bibleId: StackBibleData["id"] };
  OnTestamentDelete: { piece: Piece<"StackTestament"> };
  OnStackPiecePulledOut: void;
  OnStackPieceDrop: { piece: Piece };
  OnBibleCreationBegin: { hasABibleEverBeenCreated: boolean };
  OnBibleCreated: { bibleData: StackBibleData };
  OnBibleOpenSequenceBegin: void;
  OnBibleOpenSequenceEnd: { bibleData: StackBibleData };
  OnBibleResetSequenceStart: { bibleData: StackBibleData };
  OnBibleCloseSequenceStart: { bibleData: StackBibleData };
  OnBibleCloseSequenceEnd: { bibleData: StackBibleData };
  OnBibleResetSequenceEnd: { bibleData: StackBibleData };
  OnBibleOpenSequenceStart: { bibleData: StackBibleData };
  OnBibleCrackOpenSequenceStart: void;
  OnBibleCrackOpenSequenceEnd: void;
  OnScripturePieceHighlighted: { pieceData: AnyStackData };
  OnBookBeginSelect: { data: StackBookData | StackSectionBookData };
  OnBookEndSelect: { data: StackBookData | StackSectionBookData };
  OnBookBeginDeselect: { data: StackBookData | StackSectionBookData };
  OnBookEndDeselect: { data: StackBookData | StackSectionBookData };
  OnSectionBeginSelect: { data: StackSectionData };
  OnSectionEndSelect: { data: StackSectionData };
  OnCameraRotationChanged: void;
}

export type BibleStackEvent = keyof BibleStackEvents;
