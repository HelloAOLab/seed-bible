import { GetColorType } from "../../domain/functions/colors";
import type { PaintablePieceData } from "../../domain/models/pieces";
import type { LoggerPort } from "../ports/out/Logger";
import type { PaintPort } from "../ports/out/Paint";
import type { PaintServicePort } from "../ports/in/Paint";
import type { PieceDataRepositoryPort } from "../ports/out/PieceDataRepository";
import type { VerseDataRepositoryPort } from "../ports/out/VerseDataRepository";
import type { VersesBundleDataRepositoryPort } from "../ports/out/VersesBundleDataRepository";

interface ServiceParams {
  stackDataRepository: PieceDataRepositoryPort;
  verseDataRepository: VerseDataRepositoryPort;
  versesBundleDataRepository: VersesBundleDataRepositoryPort;
  paintAdapterPort: PaintPort;
  loggerPort: LoggerPort;
}

export class PaintService implements PaintServicePort {
  #color = "#efe5c9";
  #active: boolean = false;
  #dataRepository: ServiceParams["stackDataRepository"];
  #verseDataRepository: ServiceParams["verseDataRepository"];
  #versesBundleDataRepository: ServiceParams["versesBundleDataRepository"];
  #paintAdapter: ServiceParams["paintAdapterPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    stackDataRepository: dataRepository,
    verseDataRepository,
    versesBundleDataRepository,
    paintAdapterPort: paintAdapter,
    loggerPort,
  }: ServiceParams) {
    this.#dataRepository = dataRepository;
    this.#verseDataRepository = verseDataRepository;
    this.#versesBundleDataRepository = versesBundleDataRepository;
    this.#paintAdapter = paintAdapter;
    this.#loggerPort = loggerPort;
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
    const isValid = GetColorType(newColor);
    if (!isValid) return;
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
      this.#loggerPort.error("PaintService: data not found at paint");
      return;
    }
    if (data.paintColor === this.#color) return;
    const piece = data.piece;
    if (!piece) {
      this.#loggerPort.error("PaintService: piece not found at paint");
      return;
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
      this.#loggerPort.error("PaintService: data not found at unpaint");
      return;
    }
    if (!data.paintColor) return;
    const piece = data.piece;
    if (!piece) {
      this.#loggerPort.error("PaintService: piece not found at unpaint");
      return;
    }
    data.unpaint();
    this.#paintAdapter.unpaint(piece);
  }
}
