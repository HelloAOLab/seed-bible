import type { Piece } from "../../domain/models/canvas";
import type { ReaderNavigationPort } from "../ports/out/ReaderNavigation";
import type { PieceDataRepositoryPort } from "../ports/out/PieceDataRepository";
import type { LoggerPort } from "../ports/out/Logger";
import type { ArrangementServicePort } from "../ports/in/Arrangement";

interface ServiceParams {
  readerNavigationPort: ReaderNavigationPort;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  loggerPort: LoggerPort;
  arrangementPort: ArrangementServicePort;
}

export class ChapterNavigationService {
  #readerNavigationPort: ServiceParams["readerNavigationPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #loggerPort: ServiceParams["loggerPort"];
  #arrangementPort: ServiceParams["arrangementPort"];

  constructor({
    readerNavigationPort,
    pieceDataRepositoryPort,
    loggerPort,
    arrangementPort,
  }: ServiceParams) {
    this.#readerNavigationPort = readerNavigationPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#loggerPort = loggerPort;
    this.#arrangementPort = arrangementPort;
  }

  openChapter(chapter: Piece<"StackChapter">) {
    const data = this.#pieceDataRepositoryPort.getPieceData(chapter);

    if (!data) {
      this.#loggerPort.error(
        "ChapterNavigationService: data not found at openChapter."
      );
      return;
    }

    const bookId = data.getCreationParam("bookId");

    const { found, arrangementIndex, testamentIndex, sectionIndex, bookIndex } =
      this.#arrangementPort.getBookInfoPathById({ id: bookId });

    if (!found) {
      this.#loggerPort.error(
        "ChapterNavigationService: book info path not found at openChapter"
      );
      return;
    }

    const bookInfo = this.#arrangementPort.getBookByIndices({
      arrangementIndex,
      testamentIndex: testamentIndex!,
      sectionIndex: sectionIndex!,
      bookIndex: bookIndex!,
    });

    if (!bookInfo) {
      this.#loggerPort.error(
        "ChapterNavigationService: book info not found at openChapter"
      );
      return;
    }

    let actualBookId = bookId;
    let actualChapter = data.getPieceInfoProperty("number");

    if (bookInfo.type === "subset") {
      actualBookId = bookInfo.completeBookId;
      actualChapter = actualChapter + bookInfo.startIndex;
    }

    this.#readerNavigationPort.open(actualBookId, actualChapter);
  }
}
