import type { PaintablePieceData } from "../../domain/models/pieces";
import type { PaintPort } from "../ports/in/Paint";
import type {
  StackDataRepository,
  VerseDataRepository,
  VersesBundleDataRepository,
  PaintAdapterPort,
} from "../ports/out/Paint";

interface ServiceParams {
  stackDataRepository: StackDataRepository;
  verseDataRepository: VerseDataRepository;
  versesBundleDataRepository: VersesBundleDataRepository;
  paintAdapterPort: PaintAdapterPort;
}

export class PaintService implements PaintPort {
  #color = "#efe5c9";
  #active: boolean = false;
  #dataRepository: ServiceParams["stackDataRepository"];
  #verseDataRepository: ServiceParams["verseDataRepository"];
  #versesBundleDataRepository: ServiceParams["versesBundleDataRepository"];
  #paintAdapter: ServiceParams["paintAdapterPort"];

  constructor({
    stackDataRepository: dataRepository,
    verseDataRepository,
    versesBundleDataRepository,
    paintAdapterPort: paintAdapter,
  }: ServiceParams) {
    this.#dataRepository = dataRepository;
    this.#verseDataRepository = verseDataRepository;
    this.#versesBundleDataRepository = versesBundleDataRepository;
    this.#paintAdapter = paintAdapter;
  }

  activate() {
    this.#active = true;
  }

  deactivate() {
    this.#active = false;
  }

  get isActive() {
    return this.#active;
  }

  changeColor(newColor: string) {
    this.#color = newColor;
  }

  #resolveData(
    pieceOrData: NonNullable<PaintablePieceData["piece"]> | PaintablePieceData
  ): PaintablePieceData | undefined {
    if ("paint" in pieceOrData) {
      return pieceOrData;
    }
    switch (pieceOrData.type) {
      case "Verse":
        return this.#verseDataRepository.getVerseData(pieceOrData);
      case "VersesBundle":
        return this.#versesBundleDataRepository.getBundleData(pieceOrData);
      default:
        return this.#dataRepository.getPieceData(pieceOrData);
    }
  }

  paint(piece: NonNullable<PaintablePieceData["piece"]>): void;
  paint(data: PaintablePieceData): void;
  paint(
    pieceOrData: NonNullable<PaintablePieceData["piece"]> | PaintablePieceData
  ): void {
    const data = this.#resolveData(pieceOrData);
    if (!data) {
      throw new Error("PaintService: data not found at paint");
    }
    if (data.paintColor === this.#color) return;
    const piece = data.piece;
    if (!piece) {
      throw new Error("PaintService: piece not found at paint");
    }
    data.paint(this.#color);
    this.#paintAdapter.paint(piece, this.#color);
  }

  unpaint(piece: NonNullable<PaintablePieceData["piece"]>): void;
  unpaint(data: PaintablePieceData): void;
  unpaint(
    pieceOrData: NonNullable<PaintablePieceData["piece"]> | PaintablePieceData
  ): void {
    const data = this.#resolveData(pieceOrData);
    if (!data) {
      throw new Error("PaintService: data not found at unpaint");
    }
    if (data.paintColor === this.#color) return;
    const piece = data.piece;
    if (!piece) {
      throw new Error("PaintService: piece not found at unpaint");
    }
    data.unpaint();
    this.#paintAdapter.unpaint(piece);
  }
}
