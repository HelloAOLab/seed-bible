import type { ReadingStatePort } from "../ports/in/readingState";
import type { PieceKey, VerseReference } from "../../domain/models/piece";
import type { ExperienceKey } from "../../domain/models/experience";
import type {
  ContextMenuRendererPort,
  PieceHighlightPort,
  VerseReferenceConfigProviderPort,
} from "../ports/out/PieceInteraction";

interface PieceInteractionServiceParams {
  pieceHighlight: PieceHighlightPort;
  contextMenu: ContextMenuRendererPort;
  verseReferenceConfigProviderPort: VerseReferenceConfigProviderPort;
  readingState: ReadingStatePort;
  getExperienceKey: () => ExperienceKey;
}

export class PieceInteractionService {
  #pieceHighlight: PieceInteractionServiceParams["pieceHighlight"];
  #contextMenu: PieceInteractionServiceParams["contextMenu"];
  #readingState: PieceInteractionServiceParams["readingState"];
  #getExperienceKey: PieceInteractionServiceParams["getExperienceKey"];
  #verseReferenceConfigProviderPort: PieceInteractionServiceParams["verseReferenceConfigProviderPort"];

  constructor({
    pieceHighlight,
    contextMenu,
    readingState,
    getExperienceKey,
    verseReferenceConfigProviderPort,
  }: PieceInteractionServiceParams) {
    this.#pieceHighlight = pieceHighlight;
    this.#contextMenu = contextMenu;
    this.#verseReferenceConfigProviderPort = verseReferenceConfigProviderPort;
    this.#readingState = readingState;
    this.#getExperienceKey = getExperienceKey;
  }

  handlePieceSelection(key: PieceKey): void {
    const experience = this.#getExperienceKey();
    const reading = this.#readingState.getCurrentReading();
    let inChapter: VerseReference[] = [];
    let inOtherChapters: VerseReference[] = [];
    if (reading) {
      ({ inChapter, inOtherChapters } =
        this.#verseReferenceConfigProviderPort.getVersesForPiece({
          experienceKey: experience,
          pieceKey: key,
          currentBookId: reading.bookId,
          currentChapter: reading.chapterNumber,
        }));
    }

    this.#pieceHighlight.highlightPiece(experience, key);

    this.#contextMenu.toggleContextMenu(
      experience,
      key,
      inChapter,
      inOtherChapters
    );
  }
}
