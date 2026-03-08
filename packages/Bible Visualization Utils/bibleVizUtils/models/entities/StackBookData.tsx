import { StackPieceData } from "bibleVizUtils.models.entities.StackPieceData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import type {
  ParentDataIds,
  BookShapeType,
} from "bibleVizUtils.models.canvas.models";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";

export class StackBookData extends StackPieceData<StackChapterData> {
  #isSelected: boolean;
  #currentShape: BookShapeType;
  #queuedChapterData = undefined;
  #currentSelectedChapterData = undefined;
  #isInsideTestament: boolean;
  #isInsideSection: boolean;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds = undefined,
    isSelected = false,
    currentShape,
    isInsideBible = true,
    isInsideTestament = true,
    isInsideSection = true,
    isActive = false,
    creationInfo,
  }: {
    childrenData: StackChapterData[];
    id: string;
    piece: Bot;
    pieceInfo: any; // TODO: Define this
    parentDataIds?: ParentDataIds;
    isSelected?: boolean;
    currentShape: BookShapeType;
    isSplitIntoBooks?: boolean;
    isInExplodedView?: boolean;
    isInsideBible?: boolean;
    isInsideTestament?: boolean;
    isInsideSection?: boolean;
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
    this.#isSelected = isSelected;
    this.#currentShape = currentShape;
    this.#isInsideTestament = isInsideTestament;
    this.#isInsideSection = isInsideSection;
  }

  get isSelected() {
    return this.#isSelected;
  }
  set isSelected(value) {
    this.#isSelected = value;
  }
  get currentShape() {
    return this.#currentShape;
  }
  set currentShape(value) {
    this.#currentShape = value;
  }
  get queuedChapterData() {
    return this.#queuedChapterData;
  }
  set queuedChapterData(value) {
    this.#queuedChapterData = value;
  }
  get currentSelectedChapterData() {
    return this.#currentSelectedChapterData;
  }
  set currentSelectedChapterData(value) {
    this.#currentSelectedChapterData = value;
  }
  get isInsideTestament() {
    return this.#isInsideTestament;
  }
  set isInsideTestament(value) {
    this.#isInsideTestament = value;
  }
  get isInsideSection() {
    return this.#isInsideSection;
  }
  set isInsideSection(value) {
    this.#isInsideSection = value;
  }
}
