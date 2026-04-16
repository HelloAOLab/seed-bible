/**
 * This tag is called whenever a section is interacted by clicking or hovering it
 * It is in charge of managing whether to highlight or select a section
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found at globalThis.CanvasInteractions
 * @param {Object} that.dragEvent? - Is optional and is the information received when the type of interaction is a drag
 * @param {Object} that.dropEvent? - Is optional and is the information received when the type of interaction is a drop
 * @example
 * thisBot.HandleSectionInteraction({section: someSection, typeOfInteraction: CanvasInteractions.Drag, dragEvent: someDraginfo});
 */

import { BiblePiece, BibleState } from "bibleVizUtils.models.canvas";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackBibleData";
import { pieceDataRepository } from "bibleStack.services.index";
import type { BibleStackEvents } from "bibleStack.models.events";
import type { SectionBot } from "bibleStack.models.stack";

const getSectionRepository = (section: SectionBot) => {
  return {
    getTypeOfPiece: () => section.tags.typeOfPiece,
    getId: () => section.id,
  };
};

const checkInitialSetup = async (section: SectionBot) => {
  const sectionData = pieceDataRepository.getPieceData(
    getSectionRepository(section)
  ) as StackSectionData | undefined;

  if (!sectionData) {
    console.error("HandleSectionClick: sectionData not found");
    return false;
  }

  const { bibleData } = await (thisBot.GetDataChainFromParentDataIds({
    parentDataIds: sectionData.parentDataIds,
  }) as Promise<{ bibleData: StackBibleData | undefined }>);

  if (bibleData?.currentState === BibleState.Closed) {
    console.warn(
      "HandleSectionInteraction: Unable to interact, bible is closed."
    );
    return false;
  }

  if (thisBot.masks.isASectionMakingTourGuide) {
    console.warn(
      "HandleSectionInteraction: Unable to interact, a section is making a tour guide."
    );
    return false;
  }

  return { sectionData };
};

export async function HandleSectionClick({
  section,
  typeOfInteraction,
}: BibleStackEvents["OnSectionClick"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const result = await checkInitialSetup(section);

  if (!result) {
    return;
  }

  const { sectionData } = result;

  switch (typeOfInteraction) {
    case CanvasInteractions.Click:
      {
        if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
          BibleVizUtils.Functions.HighlightBiblePiece({ data: sectionData });
        } else {
          if (section.masks.isHighlighted) {
            if (!sectionData.isSplitIntoBooks) {
              thisBot.SelectSection({ section });
            }
          } else {
            thisBot.TryHighlightPiece({
              piece: section,
              highlightRequestSource: CanvasInteractions.Click,
              typeOfPiece: BiblePiece.StackSection,
            });
          }
        }
      }
      break;
    case CanvasInteractions.Tap:
      {
        if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
          BibleVizUtils.Functions.HighlightBiblePiece({ data: sectionData });
        } else {
          thisBot.SelectSection({ section });
        }
      }
      break;
  }
}

export async function HandleSectionDrag({
  section,
}: BibleStackEvents["OnSectionDrag"]) {
  if (thisBot.masks.isBibleAnimating || !section.tags.draggable) return;

  const result = await checkInitialSetup(section);

  if (!result) {
    return;
  }

  const { sectionData } = result;

  shout("OnStackPieceDrag", { piece: section, data: sectionData });
}

export async function HandleSectionPointerEnter({
  section,
}: BibleStackEvents["OnSectionPointerEnter"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const result = await checkInitialSetup(section);

  if (!result) {
    return;
  }

  thisBot.TryHighlightPiece({
    piece: section,
    highlightRequestSource: CanvasInteractions.HoverBegin,
    typeOfPiece: BiblePiece.StackSection,
  });
}

export async function HandleSectionPointerExit({
  section,
}: BibleStackEvents["OnSectionPointerExit"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const result = await checkInitialSetup(section);

  if (!result) {
    return;
  }

  thisBot.TryUnhighlightPiece({
    piece: section,
    delay: 4000,
    requestSource: CanvasInteractions.HoverEnd,
  });
}

export async function HandleSectionDragging({
  section,
  draggingEvent,
}: BibleStackEvents["OnSectionDragging"]) {
  if (thisBot.masks.isBibleAnimating || !section.tags.draggable) return;

  const result = await checkInitialSetup(section);

  if (!result) {
    return;
  }

  shout("OnStackPieceDragging", { piece: section, draggingEvent });
}

export async function HandleSectionDrop({
  section,
  dropEvent,
}: BibleStackEvents["OnSectionDrop"]) {
  if (thisBot.masks.isBibleAnimating || !section.tags.draggable) return;

  const result = await checkInitialSetup(section);

  if (!result) {
    return;
  }

  shout("OnStackPieceDrop", { piece: section, dropEvent });
}

export async function HandleSectionPointerUp({
  section,
}: BibleStackEvents["OnSectionPointerUp"]) {
  if (!section.tags.draggable) return;

  const result = await checkInitialSetup(section);

  if (!result) {
    return;
  }

  shout("OnStackPiecePointerUp", { piece: section });
}
