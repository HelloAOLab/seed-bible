import type { ReadingStatePort } from "../ports/in/readingState";
import type { PieceKey } from "../../domain/models/piece";
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
  #pieceHighlight: PieceHighlightPort;
  #contextMenu: ContextMenuRendererPort;
  #readingState: ReadingStatePort;
  #getExperienceKey: () => ExperienceKey;
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
    const { inChapter, inOtherChapters } =
      this.#verseReferenceConfigProviderPort.getVersesForPiece({
        experienceKey: experience,
        pieceKey: key,
        currentBookId: reading?.bookId ?? "",
        currentChapter: reading?.chapterNumber ?? 0,
      });

    this.#pieceHighlight.highlightPiece(experience, key);

    this.#contextMenu.toggleContextMenu(
      experience,
      key,
      inChapter,
      inOtherChapters
    );
  }
}
