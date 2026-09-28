import type { VersesBundleData } from "../../domain/entities/VersesBundleData";
import type { VersesBundleSelectionServicePort } from "../ports/in/VersesBundleSelection";
import type {
  PaintAdapterPort,
  PieceLifecycleAdapterPort,
  VersesBundleSelectionAdapterPort,
} from "../ports/out/VersesBundleSelection";

interface ServiceParams {
  pieceLifecycleAdapterPort: PieceLifecycleAdapterPort;
  paintAdapter: PaintAdapterPort;
  selectionAdapterPort: VersesBundleSelectionAdapterPort;
}

export class VersesBundleSelectionService implements VersesBundleSelectionServicePort {
  #pieceLifecycleAdapterPort: ServiceParams["pieceLifecycleAdapterPort"];
  #paintAdapter: ServiceParams["paintAdapter"];
  #selectionAdapterPort: ServiceParams["selectionAdapterPort"];

  constructor({
    pieceLifecycleAdapterPort,
    paintAdapter,
    selectionAdapterPort,
  }: ServiceParams) {
    this.#pieceLifecycleAdapterPort = pieceLifecycleAdapterPort;
    this.#paintAdapter = paintAdapter;
    this.#selectionAdapterPort = selectionAdapterPort;
  }

  async selectBundle(data: VersesBundleData): Promise<void> {
    const bundlePiece = data.piece;
    if (!bundlePiece) {
      throw new Error(
        "VersesBundleSelectionService: data.piece not defined at selectBundle"
      );
    }

    data.select();
    const verseStart = data.getCreationParam("start");
    for (const verseData of data.verses) {
      verseData.setPiece(this.#pieceLifecycleAdapterPort.spawnVerseDomain());
    }

    await this.#selectionAdapterPort.select({
      bundle: bundlePiece,
      verseStart,
      verses: data.verses.map((verseData) => {
        if (!verseData.piece) {
          throw new Error(
            "VersesBundleSelectionService: verseData.piece not defined at selectBundle"
          );
        }
        return verseData.piece;
      }),
    });

    data.verses.forEach((verseData) => {
      if (verseData.paintColor) {
        this.#paintAdapter.paint(verseData.piece!, verseData.paintColor);
      }
    });
  }
}
