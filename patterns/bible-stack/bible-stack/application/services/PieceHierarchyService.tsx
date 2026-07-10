import type {
  ParentDataChain,
  PieceHierarchyPieceDataRepositoryPort,
  PieceHierarchyStackDataRepositoryPort,
  PieceHierarchyServicePort,
  StackParentDataIds,
} from "../ports/pieces";

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

  getParentDataChain: (parentDataIds: StackParentDataIds) => ParentDataChain = (
    parentDataIds
  ) => {
    return {
      bibleData: parentDataIds.stackBibleId
        ? this.#bibleDataRepositoryPort.getBibleDataById(
            parentDataIds.stackBibleId
          )
        : undefined,
      testamentData: parentDataIds.stackTestamentId
        ? this.#pieceDataRepositoryPort.getDataById(
            "StackTestament",
            parentDataIds.stackTestamentId
          )
        : undefined,
      sectionData: parentDataIds.stackSectionId
        ? this.#pieceDataRepositoryPort.getDataById(
            "StackSection",
            parentDataIds.stackSectionId
          )
        : undefined,
      sectionBookData: parentDataIds.stackSectionBookId
        ? this.#pieceDataRepositoryPort.getDataById(
            "StackSectionBook",
            parentDataIds.stackSectionBookId
          )
        : undefined,
      bookData: parentDataIds.stackBookId
        ? this.#pieceDataRepositoryPort.getDataById(
            "StackBook",
            parentDataIds.stackBookId
          )
        : undefined,
    };
  };
}
