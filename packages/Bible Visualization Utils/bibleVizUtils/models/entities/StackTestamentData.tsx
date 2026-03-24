import { StackPieceData } from "bibleVizUtils.models.entities.StackPieceData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
import {
  ExplodeStackActions,
  type ExplodeStackAction,
  type ExplodeStackCommand,
  type ParentDataIds,
  type StackTestamentCreationParams,
} from "bibleVizUtils.models.canvas";
import type { TestamentInfo } from "bibleVizUtils.data.BibleVizDataRepository";

interface DataParams {
  childrenData?: (StackSectionData | StackSectionBookData)[];
  id: string;
  piece?: Bot;
  pieceInfo: TestamentInfo;
  parentDataIds: ParentDataIds;
  isSplitIntoSections?: boolean;
  isInsideBible?: boolean;
  creationParams: StackTestamentCreationParams;
  isActive?: boolean;
}
export class StackTestamentData extends StackPieceData<
  StackSectionData | StackSectionBookData,
  TestamentInfo,
  StackTestamentCreationParams
> {
  #isSplitIntoSections: DataParams["isSplitIntoSections"];

  constructor({
    childrenData = [],
    id,
    piece,
    pieceInfo,
    parentDataIds,
    isSplitIntoSections = false,
    isInsideBible = true,
    creationParams,
    isActive = false,
  }: DataParams) {
    super({
      childrenData,
      id,
      piece,
      pieceInfo,
      parentDataIds,
      isInsideBible,
      isActive,
      creationParams,
      isHidden: false,
    });
    this.#isSplitIntoSections = isSplitIntoSections;
  }

  get isSplitIntoSections() {
    return this.#isSplitIntoSections;
  }
  split() {
    this.#isSplitIntoSections = true;
  }
  combine() {
    this.#isSplitIntoSections = false;
  }
  findExplodedSection(): StackSectionData | undefined {
    return this.childrenData.find((section) => {
      return section instanceof StackSectionData && section.isInExplodedView;
    }) as StackSectionData | undefined;
  }
  hasExplodedSection(): boolean {
    const explodedSection = this.findExplodedSection();
    return !!explodedSection;
  }
  getArrangementIndex(): DataParams["creationParams"]["arrangementIndex"] {
    return this.creationParams.arrangementIndex;
  }
  getTestamentIndex(): DataParams["creationParams"]["testamentIndex"] {
    return this.creationParams.testamentIndex;
  }
  resetHierarchy(clearPiece: boolean = true, split: boolean = false): Bot[] {
    if (split) this.split();
    return super.resetHierarchy(clearPiece);
  }
  tryExplodeSplitSections(): boolean {
    return this.childrenData.some((section) => {
      if (section instanceof StackSectionData) {
        return section.tryExplode();
      }
      return false;
    });
  }
  isSplittable(): boolean {
    return !!this.isActive && !this.isSplitIntoSections;
  }
  getPureSectionsReversed(): StackSectionData[] {
    return this.getReversedChildren().filter(
      (section) => section instanceof StackSectionData
    );
  }
  getExplodeAnimationCommands(): ExplodeStackCommand[] {
    const plan: ExplodeStackCommand[] = [];

    const reversedSections = this.getPureSectionsReversed();
    for (const section of reversedSections) {
      if (section.piece) {
        let action: ExplodeStackAction | undefined;
        if (section.isExplodable()) {
          action = ExplodeStackActions.ExplodeSection;
        } else if (section.isSplittable()) {
          action = ExplodeStackActions.SelectSection;
        }
        if (action) {
          plan.push({ piece: section.piece, action });
        }
      }
    }

    return plan;
  }
  implodeSections() {
    this.childrenData.forEach((section) => {
      if (section instanceof StackSectionData) section.implode();
    });
  }
  isEmpty(): boolean {
    if (this.isSplitIntoSections) {
      return !this.childrenData.some((sectionData) => {
        return sectionData instanceof StackSectionData &&
          sectionData.isSplitIntoBooks
          ? true
          : sectionData.isActive;
      });
    }
    return !this.isActive;
  }
  isPieceAvailable(): boolean {
    return !this.#isSplitIntoSections && super.isPieceAvailable();
  }
}
