import { StackPieceData } from "bibleVizUtils.models.entities.StackPieceData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
import type { ParentDataIds } from "bibleVizUtils.models.canvas.models";

export class StackSectionData extends StackPieceData<StackBookData[]> {
  #isSplitIntoBooks: boolean;
  #isInExplodedView: boolean;
  #isInsideTestament: boolean;
  #shadow: Bot | undefined;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isSplitIntoBooks = false,
    isInExplodedView = false,
    isInsideBible = true,
    isInsideTestament = true,
    isActive = false,
    creationInfo = false,
  }: {
    childrenData: StackBookData[][];
    id: string;
    piece: Bot;
    pieceInfo: any; // TODO: Define this
    parentDataIds: ParentDataIds;
    isSplitIntoBooks?: boolean;
    isInExplodedView?: boolean;
    isInsideBible?: boolean;
    isInsideTestament?: boolean;
    creationInfo: any; // TODO: Define this
    isActive: boolean;
  }) {
    super({
      childrenData,
      id,
      piece,
      pieceInfo,
      parentDataIds,
      isInsideBible,
      isActive,
      creationInfo,
      isHidden: false,
    });
    this.#isSplitIntoBooks = isSplitIntoBooks;
    this.#isInExplodedView = isInExplodedView;
    this.#isInsideTestament = isInsideTestament;
  }

  get isSplitIntoBooks() {
    return this.#isSplitIntoBooks;
  }
  set isSplitIntoBooks(value) {
    this.#isSplitIntoBooks = value;
  }
  get isInExplodedView() {
    return this.#isInExplodedView;
  }
  set isInExplodedView(value) {
    this.#isInExplodedView = value;
  }
  get isInsideTestament() {
    return this.#isInsideTestament;
  }
  set isInsideTestament(value) {
    this.#isInsideTestament = value;
  }
  get shadow() {
    return this.#shadow;
  }
  set shadow(value) {
    this.#shadow = value;
  }
}
