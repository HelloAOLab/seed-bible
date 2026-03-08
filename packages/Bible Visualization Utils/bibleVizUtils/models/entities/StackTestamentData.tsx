import { StackPieceData } from "bibleVizUtils.models.entities.StackPieceData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
import type { ParentDataIds } from "bibleVizUtils.models.canvas.models";

export class StackTestamentData extends StackPieceData<
  StackSectionData | StackSectionBookData
> {
  #isSplitIntoSections: boolean;

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isSplitIntoSections = false,
    isInsideBible = true,
    creationInfo,
    isActive,
  }: {
    childrenData: (StackSectionData | StackSectionBookData)[];
    id: string;
    piece: Bot;
    pieceInfo: any; // TODO: Define this
    parentDataIds: ParentDataIds;
    isSplitIntoSections?: boolean;
    isInsideBible?: boolean;
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
    this.#isSplitIntoSections = isSplitIntoSections;
  }

  get isSplitIntoSections() {
    return this.#isSplitIntoSections;
  }
}
