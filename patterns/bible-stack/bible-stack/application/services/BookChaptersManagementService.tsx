import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type { Piece } from "../../domain/models/canvas";
import type { BookChaptersManagementServicePort } from "../ports/in/BookChaptersManagement";
import type { ScripturePort } from "../ports/in/Scripture";
import type { ScripturePiecesStateServicePort } from "../ports/in/ScripturePiecesState";
import type { PieceLabelServicePort } from "../ports/in/PieceLabel";
import type {
  BookChaptersManagementAdapterPort,
  ChapterSpawnerPort,
} from "../ports/out/BookChaptersManagement";
import type { BibleDataRepositoryPort } from "../ports/out/StackUpdate";

interface ServiceParams {
  biggerChapterProviderPort: ScripturePort;
  chapterSpawnerPort: ChapterSpawnerPort;
  chaptersManagementAdapterPort: BookChaptersManagementAdapterPort;
  scripturePiecesStateServicePort: ScripturePiecesStateServicePort;
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  pieceLabelServicePort: PieceLabelServicePort<"StackChapter">;
}

export class BookChaptersManagementService implements BookChaptersManagementServicePort {
  #biggerChapterProviderPort: ServiceParams["biggerChapterProviderPort"];
  #chapterSpawnerPort: ServiceParams["chapterSpawnerPort"];
  #chaptersManagementAdapterPort: ServiceParams["chaptersManagementAdapterPort"];
  #scripturePiecesStateServicePort: ServiceParams["scripturePiecesStateServicePort"];
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #pieceLabelServicePort: ServiceParams["pieceLabelServicePort"];

  constructor({
    biggerChapterProviderPort,
    chapterSpawnerPort,
    chaptersManagementAdapterPort,
    scripturePiecesStateServicePort,
    bibleDataRepositoryPort,
    pieceLabelServicePort,
  }: ServiceParams) {
    this.#biggerChapterProviderPort = biggerChapterProviderPort;
    this.#chapterSpawnerPort = chapterSpawnerPort;
    this.#chaptersManagementAdapterPort = chaptersManagementAdapterPort;
    this.#scripturePiecesStateServicePort = scripturePiecesStateServicePort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
  }

  showChapters(bookData: StackBookData | StackSectionBookData) {
    if (!bookData.piece) {
      throw new Error(
        "BookChaptersManagementService: bookData.piece not defined at showChapters"
      );
    }

    bookData.showChapters();
    const bookInfo =
      bookData.type === "StackBook"
        ? bookData.pieceInfo
        : bookData.pieceBookInfo;

    for (const chapterData of bookData.childrenData) {
      if (!chapterData.isActive) {
        const chapter = this.#chapterSpawnerPort.spawnChapterDomain();
        chapterData.setPiece(chapter);
        chapterData.attachToBible();
        chapterData.attachToBook();
        chapterData.activate();
        chapterData.show();
        this.#chaptersManagementAdapterPort.setUpChapter({
          chapter,
          book: bookData.piece,
          bookInfo,
          chapterInfo: chapterData.pieceInfo,
          isMovable: this.#scripturePiecesStateServicePort.arePiecesDraggable,
          biggerChapter: this.#biggerChapterProviderPort.getBiggerChapter(),
        });
      }
    }
    this.updateChaptersPosition(bookData);
  }

  hideChapters(bookData: StackBookData | StackSectionBookData) {
    if (!bookData.piece) {
      throw new Error(
        "BookChaptersManagementService: bookData.piece not defined at hideChapters"
      );
    }

    if (!bookData.isShowingChapters) {
      return;
    }

    bookData.hideChapters();
    bookData.clearPreviousHighlightedChapterData();

    for (const chapterData of bookData.childrenData) {
      const piece = chapterData.piece;
      if (!chapterData.isActive || !chapterData.isInsideBook || !piece) {
        continue;
      }

      // A chapter may carry a highlight label (spawned by the highlighting
      // system, not by showChapters), so release it before despawning the piece.
      if (this.#pieceLabelServicePort.getPieceLabel(piece)) {
        void this.#pieceLabelServicePort.hideLabel(piece);
      }

      this.#chapterSpawnerPort.despawnChapter(piece);
      chapterData.resetData();
    }
  }

  updateChaptersPosition(bookData: StackBookData | StackSectionBookData) {
    if (!bookData.piece) {
      throw new Error(
        "BookChaptersManagementService: bookData.piece not defined at updateChaptersPosition"
      );
    }

    const chapters: { piece: Piece<"StackChapter">; isSelected: boolean }[] =
      [];
    for (const chapterData of bookData.childrenData) {
      const piece = chapterData.piece;
      if (
        chapterData.isInsideBook &&
        chapterData.isActive &&
        !chapterData.isHidden &&
        piece
      ) {
        chapters.push({ piece, isSelected: chapterData.isSelected });
      }
    }

    if (chapters.length === 0) {
      return;
    }

    // Books inside a bible are children of that bible's transformer, so their
    // chapters need the transformer to be placed in world space. Resolve the
    // parent bible's transformer piece here (domain) and let the adapter map it.
    const bibleId = bookData.getParentId("stackBibleId");
    const bibleData = bibleId
      ? this.#bibleDataRepositoryPort.getBibleDataById(bibleId)
      : undefined;
    const bibleTransformer =
      bibleData?.getStaticPiece("bibleTransformer") ?? null;

    this.#chaptersManagementAdapterPort.updateChaptersPosition({
      book: bookData.piece,
      chapters,
      bibleTransformer,
    });
  }
}
