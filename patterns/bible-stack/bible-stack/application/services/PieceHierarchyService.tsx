import type {
  PieceHierarchyPieceDataRepositoryPort,
  PieceHierarchyStackDataRepositoryPort,
} from "../ports/pieces";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type {
  ParentDataIds,
  ParentDataChain,
} from "../../domain/models/canvas";

interface ServiceParams {
  pieceDataRepositoryPort: PieceHierarchyPieceDataRepositoryPort;
  bibleDataRepositoryPort: PieceHierarchyStackDataRepositoryPort;
}

export class PieceHierarchyService implements PieceHierarchyServicePort {
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];

  constructor({
    pieceDataRepositoryPort,
    bibleDataRepositoryPort,
  }: ServiceParams) {
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
  }

  getParentDataChain: (parentDataIds: ParentDataIds) => ParentDataChain = (
    parentDataIds
  ) => {
    return {
      bibleData: parentDataIds.stackBibleId
        ? this.#bibleDataRepositoryPort.getBibleDataById(
            parentDataIds.stackBibleId
          )
        : undefined,
      testamentData: parentDataIds.stackTestamentId
        ? this.#pieceDataRepositoryPort.getDataById({
            type: "StackTestament",
            id: parentDataIds.stackTestamentId,
          })
        : undefined,
      sectionData: parentDataIds.stackSectionId
        ? this.#pieceDataRepositoryPort.getDataById({
            type: "StackSection",
            id: parentDataIds.stackSectionId,
          })
        : undefined,
      sectionBookData: parentDataIds.stackSectionBookId
        ? this.#pieceDataRepositoryPort.getDataById({
            type: "StackSectionBook",
            id: parentDataIds.stackSectionBookId,
          })
        : undefined,
      bookData: parentDataIds.stackBookId
        ? this.#pieceDataRepositoryPort.getDataById({
            type: "StackBook",
            id: parentDataIds.stackBookId,
          })
        : undefined,
    };
  };
}
