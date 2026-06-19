import { StackPieceData } from "bibleVizUtils.domain.entities.StackPieceData";
import { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import {
  ExplodeStackActions,
  type ExplodeStackAction,
  type ExplodeStackCommand,
  type ParentDataIds,
  type StackTestamentCreationParams,
} from "bibleVizUtils.domain.models.canvas";
import type { TestamentInfo } from "bibleVizUtils.domain.models.arrangement";
import type { BiblePieceType, Piece } from "bibleVizUtils.domain.models.canvas";
import {
  SelectionStates,
  SelectionEvents,
  simpleSelectionFSM,
} from "bibleVizUtils.domain.models.selection";
import type { ActiveBibleHierarchy } from "./StackBibleData";

interface DataParams {
  childrenData?: (StackSectionData | StackSectionBookData)[];
  id: string;
  piece?: Piece<"StackTestament">;
  pieceInfo: TestamentInfo;
  parentDataIds: ParentDataIds;
  isSplitIntoSections?: boolean;
  isInsideBible?: boolean;
  creationParams: StackTestamentCreationParams;
  isActive?: boolean;
  isHighlighted?: boolean;
}
export class StackTestamentData extends StackPieceData<
  StackSectionData | StackSectionBookData,
  TestamentInfo,
  StackTestamentCreationParams,
  "StackTestament"
> {
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
    isHighlighted,
  }: DataParams) {
    super({
      isHighlighted,
      childrenData,
      id,
      piece,
      pieceInfo,
      parentDataIds,
      isInsideBible,
      isActive,
      creationParams,
      isHidden: false,
      type: "StackTestament",
      selectionFSM: simpleSelectionFSM,
    });
    if (isSplitIntoSections) {
      this.changeSelectionState(SelectionEvents.RequestSelect);
    }
  }

  get isSplitIntoSections() {
    return this.selectionState !== SelectionStates.Idle;
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
  override resetHierarchy(
    clearPiece: boolean = true,
    split: boolean = false
  ): Piece[] {
    this.resetSelectionState();
    if (split) {
      this.changeSelectionState(SelectionEvents.RequestSelect);
    }
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
  isSelectable(): boolean {
    return !!this.isActive && this.selectionState === SelectionStates.Idle;
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
        } else if (section.isSelectable()) {
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

  collectActiveHierarchy(hierarchy: ActiveBibleHierarchy) {
    if (this.isSplitIntoSections) {
      for (const child of this.childrenData) {
        child.collectActiveHierarchy(hierarchy);
      }
    } else if (this.isActive) {
      hierarchy.testamentsData.push(this);
    }
  }
  hasActiveContent(stopAtLayer?: BiblePieceType): boolean {
    if (this.type === stopAtLayer) {
      return this.isActive || this.selectionState !== SelectionStates.Idle;
    }

    if (this.selectionState !== SelectionStates.Idle) {
      return this.childrenData.some((child) =>
        child.hasActiveContent(stopAtLayer)
      );
    }

    return this.isActive;
  }

  isEmpty(stopAtLayer?: BiblePieceType): boolean {
    return !this.hasActiveContent(stopAtLayer);
  }

  getActiveSections(): (StackSectionData | StackSectionBookData)[] {
    return this.childrenData.filter((data) => data.isActive);
  }
}
