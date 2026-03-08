import {
  Vector2 as Vector2Type,
  type Bot,
} from "../../../../../typings/AuxLibraryDefinitions";
import { StackPieceData } from "bibleVizUtils.models.entities.StackPieceData";
import type { ParentDataIds } from "bibleVizUtils.models.canvas.models";

export class StackChapterData extends StackPieceData<never> {
  #isSelected: boolean;
  #highlightsInfo: any[] = []; // TODO: Define this
  #isInsideBook: boolean | undefined;

  constructor({
    isSelected,
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isInsideBible = true,
    isInsideBook = true,
    isHidden = false,
    creationInfo = false,
  }: {
    isSelected: boolean;
    id: string;
    piece: Bot;
    pieceInfo: any; // TODO: Define this
    parentDataIds: ParentDataIds;
    isInsideBible: boolean;
    isInsideBook?: boolean;
    isActive?: boolean;
    isHidden?: boolean;
    creationInfo: any; // TODO: Define this
  }) {
    super({
      id,
      piece,
      pieceInfo,
      parentDataIds,
      isInsideBible,
      isHidden,
      creationInfo,
      isActive: true,
    });
    this.#isInsideBook = isInsideBook;
    this.#isSelected = isSelected;
  }

  override ResetData() {
    super.ResetData();
    this.#isInsideBook = undefined;
    this.#isSelected = false;
  }

  AddHighlightInfo(newHighlightInfo: any) {
    this.#highlightsInfo.push(newHighlightInfo);
  }

  GetHighlightInfoByKey(key: string) {
    return this.#highlightsInfo.find((highlightInfo) => {
      return highlightInfo.key === key;
    });
  }

  getIsSelectedForNotification(): boolean {
    return !!this.piece?.masks.isExpanded;
  }

  getNotificationDirection(): Vector2Type {
    return new Vector2(1, -1);
  }

  get isSelected() {
    return this.#isSelected;
  }
  set isSelected(value) {
    this.#isSelected = value;
  }
  get isInsideBook() {
    return this.#isInsideBook;
  }
  set isInsideBook(value) {
    this.#isInsideBook = value;
  }
}
