import type { VersesBundleData } from "../../domain/entities/VersesBundleData";
import type { Piece } from "../../domain/models/canvas";
import type { VersesBundleSelectionServicePort } from "../ports/in/VersesBundleSelection";
import type { LoggerPort } from "../ports/out/Logger";
import type { VersesBundleSelectionPort } from "../ports/out/VersesBundleSelection";
import type { StackPieceLifecyclePort } from "../ports/out/StackPieceLifecycle";
import type { PaintPort } from "../ports/out/Paint";

interface ServiceParams {
  pieceLifecycleAdapterPort: StackPieceLifecyclePort;
  paintAdapter: PaintPort;
  selectionAdapterPort: VersesBundleSelectionPort;
  loggerPort: LoggerPort;
}

export class VersesBundleSelectionService implements VersesBundleSelectionServicePort {
  #pieceLifecycleAdapterPort: ServiceParams["pieceLifecycleAdapterPort"];
  #paintAdapter: ServiceParams["paintAdapter"];
  #selectionAdapterPort: ServiceParams["selectionAdapterPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    pieceLifecycleAdapterPort,
    paintAdapter,
    selectionAdapterPort,
    loggerPort,
  }: ServiceParams) {
    this.#pieceLifecycleAdapterPort = pieceLifecycleAdapterPort;
    this.#paintAdapter = paintAdapter;
    this.#selectionAdapterPort = selectionAdapterPort;
    this.#loggerPort = loggerPort;
  }

  async selectBundle(data: VersesBundleData): Promise<void> {
    const bundlePiece = data.piece;
    if (!bundlePiece) {
      this.#loggerPort.error(
        "VersesBundleSelectionService: data.piece not defined at selectBundle"
      );
      return;
    }

    data.select();
    const verseStart = data.getCreationParam("start");
    for (const verseData of data.verses) {
      verseData.setPiece(this.#pieceLifecycleAdapterPort.spawnVerseDomain());
    }

    await this.#selectionAdapterPort.select({
      bundle: bundlePiece,
      verseStart,
      verses: data.verses
        .map((verseData) => {
          if (!verseData.piece) {
            this.#loggerPort.error(
              "VersesBundleSelectionService: verseData.piece not defined at selectBundle"
            );
            return undefined;
          }
          return verseData.piece;
        })
        .filter(Boolean) as Piece<"Verse">[],
    });

    data.verses.forEach((verseData) => {
      if (verseData.piece && verseData.paintColor) {
        this.#paintAdapter.paint(verseData.piece, verseData.paintColor);
      }
    });
  }
}
