import type { Piece } from "../../domain/models/canvas";
import type { ViewportPort } from "../ports/in/ViewportPort";
import type {
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
} from "../ports/out/ViewportService";

interface ServiceParams {
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
}

export class ViewportService implements ViewportPort {
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];

  constructor({
    bibleDataRepositoryPort,
    pieceDataRepositoryPort,
  }: ServiceParams) {
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
  }

  getVisiblePieces(): Piece[] {
    const pieces: Piece[] = [];

    // Bibles aren't stack pieces themselves; collect from each testament tree.
    for (const bible of this.#bibleDataRepositoryPort.getAllBiblesData()) {
      for (const testament of bible.childrenData) {
        pieces.push(...testament.getHierarchyVisiblePieces());
      }
    }

    // Standalone roots (not nested inside a bible / parent) and their trees.
    const standaloneRoots = [
      ...this.#pieceDataRepositoryPort.getStandaloneTestaments(),
      ...this.#pieceDataRepositoryPort.getStandaloneSections(),
      ...this.#pieceDataRepositoryPort.getStandaloneSectionBooks(),
      ...this.#pieceDataRepositoryPort.getStandaloneBooks(),
    ];
    for (const root of standaloneRoots) {
      pieces.push(...root.getHierarchyVisiblePieces());
    }

    return pieces;
  }
}
