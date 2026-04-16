import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackTestamentData";

interface PieceLifecyclePort {
  deletePiece: (pieceId: string) => void;
  deletePieces: (piecesId: string[]) => void;
}

interface PieceManagementService {
  deleteTestaments: (testaments: StackTestamentData[]) => void;
}

interface BibleDataRepository {
  removeBibleData: (data: StackBibleData) => void;
}

interface BibleManagementServiceProps {
  pieceLifecyclePort: PieceLifecyclePort;
  pieceManagementService: PieceManagementService;
  bibleDataRepository: BibleDataRepository;
}

export class BibleManagementService {
  #pieceLifecyclePort: BibleManagementServiceProps["pieceLifecyclePort"];
  #pieceManagementService: BibleManagementServiceProps["pieceManagementService"];
  #bibleDataRepository: BibleManagementServiceProps["bibleDataRepository"];

  constructor({
    pieceLifecyclePort,
    pieceManagementService,
    bibleDataRepository,
  }: BibleManagementServiceProps) {
    this.#pieceLifecyclePort = pieceLifecyclePort;
    this.#pieceManagementService = pieceManagementService;
    this.#bibleDataRepository = bibleDataRepository;
  }

  deleteBible(bibleData: StackBibleData) {
    this.#bibleDataRepository.removeBibleData(bibleData);
    const clearedPieces = bibleData.clearStaticBiblePieces();
    if (clearedPieces) {
      this.#pieceLifecyclePort.deletePieces(clearedPieces);
    }
    const children = bibleData.clearChildren();
    this.#pieceManagementService.deleteTestaments(children);

    // TODO: Send OnBibleDelete event that will be listened by the StackInteractionManager to check if the deleted bible is the last interacted
  }

  deleteBibles(biblesData: StackBibleData[]) {
    for (const bibleData of biblesData) {
      this.deleteBible(bibleData);
    }
  }
}
