import { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
import type {
  ParentDataIds,
  ParentDataId,
  StackSectionBaseCreationParams,
} from "bibleVizUtils.models.canvas";
import type { BookInfo } from "bibleVizUtils.data.BibleVizDataRepository";
import type { HexString } from "bibleVizUtils.models.commonTypes";

interface DataParams {
  childrenData: LayoutChapterData[];
  id: string;
  piece?: Bot;
  pieceInfo: BookInfo;
  isSelected?: boolean;
  parentDataIds: ParentDataIds;
  creationParams: StackSectionBaseCreationParams;
  highlightColor?: HexString;
  isActive?: boolean;
}

export class LayoutBookData {
  #creationParams: DataParams["creationParams"];
  #childrenData: DataParams["childrenData"];
  #id: string;
  #piece: Bot | undefined;
  #pieceInfo: DataParams["pieceInfo"];
  #isSelected: NonNullable<DataParams["isSelected"]>;
  #parentDataIds: DataParams["parentDataIds"];
  #highlightColor: DataParams["highlightColor"];
  #isActive: DataParams["isActive"];

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    isSelected = false,
    parentDataIds,
    creationParams,
    isActive = false,
  }: DataParams) {
    this.#creationParams = creationParams;
    this.#childrenData = childrenData;
    this.#id = id;
    this.#piece = piece;
    this.#pieceInfo = pieceInfo;
    this.#isSelected = isSelected;
    this.#parentDataIds = parentDataIds;
    this.#isActive = isActive;
  }

  addChild(newChild: DataParams["childrenData"][number]) {
    this.#childrenData.push(newChild);
  }
  clearChildren(): DataParams["childrenData"] {
    const clearedChildren = this.childrenData;
    this.#childrenData = [];
    return clearedChildren;
  }
  tryReplaceChild(
    currChild: DataParams["childrenData"][number],
    newChild: DataParams["childrenData"][number]
  ): boolean {
    const index = this.#childrenData.indexOf(currChild);
    if (index >= 0) {
      this.#childrenData.splice(index, 1, newChild);
      return true;
    }
    return false;
  }
  get childrenData() {
    return [...this.#childrenData];
  }
  get id() {
    return this.#id;
  }
  get piece() {
    return this.#piece;
  }
  clearPiece(): DataParams["piece"] | undefined {
    let piece: DataParams["piece"] | undefined;
    if (this.piece) {
      piece = this.piece;
    }
    return piece;
  }
  setPiece(piece: Bot) {
    this.#piece = piece;
  }
  get pieceInfo() {
    return this.#pieceInfo;
  }
  get isSelected() {
    return this.#isSelected;
  }
  select() {
    this.#isSelected = true;
  }
  deselect() {
    this.#isSelected = false;
  }
  get parentDataIds() {
    if (this.#parentDataIds) {
      return { ...this.#parentDataIds };
    }
    return undefined;
  }
  get creationParams() {
    return this.#creationParams;
  }
  clearParentId(key: ParentDataId) {
    if (this.#parentDataIds) {
      this.#parentDataIds[key] = undefined;
    }
  }
  clearParentIds(keys: ParentDataId[], propagate: boolean = true) {
    if (this.#parentDataIds) {
      for (const key of keys) {
        this.clearParentId(key);
      }
    }
    if (propagate) {
      this.childrenData.forEach((childData) => {
        childData.clearParentIds(keys);
      });
    }
  }
  get highlightColor(): DataParams["highlightColor"] {
    return this.#highlightColor;
  }
  setHihglightColor(color: HexString) {
    this.#highlightColor = color;
  }
  clearHighlightColor() {
    this.#highlightColor = undefined;
  }
  get isActive() {
    return this.#isActive;
  }
  activate() {
    this.#isActive = true;
  }
  deactivate() {
    this.#isActive = false;
  }
}
