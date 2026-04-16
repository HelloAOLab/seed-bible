/**
 * This tag is called whenever a testament is interacted by clicking or hovering it
 * It is in charge of managing whether to highlight or select a testament
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found on interactiveBible.managers.StackManager.DefineGlobals on CanvasInteractions
 * @param {Object} that.dragEvent? - Is optional and is the information received when the type of interaction is a drag
 * @param {Object} that.dropEvent? - Is optional and is the information received when the type of interaction is a drop
 * @example
 * thisBot.HandleTestamentInteraction({testament: someTestament, typeOfInteraction: CanvasInteractions.Drag, dragEvent: someDragInfo});
 */

import { BibleState, BiblePiece } from "bibleVizUtils.models.canvas";
import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { DraggingEvent, DropEvent } from "bibleVizUtils.models.casualos";
import type { BibleStackEvents } from "bibleStack.models.events";
import type { TestamentBot } from "bibleStack.models.stack";
import { pieceDataRepository } from "bibleStack.services.index";

const getTestamentRepository = (testament: TestamentBot) => {
  return {
    getTypeOfPiece: () => testament.tags.typeOfPiece,
    getId: () => testament.id,
  };
};

const checkInitialSetup = async (testament: TestamentBot) => {
  const testamentData = pieceDataRepository.getPieceData(
    getTestamentRepository(testament)
  ) as StackTestamentData | undefined;

  if (!testamentData) {
    console.error("testamentInteractionController: testamentData not found");
    return false;
  }

  const { bibleData } = await (thisBot.GetDataChainFromParentDataIds({
    parentDataIds: testamentData.parentDataIds,
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

  return { testamentData };
};

export async function HandleTestamentClick({
  testament,
  typeOfInteraction,
}: BibleStackEvents["OnTestamentClick"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const result = await checkInitialSetup(testament);

  if (!result) {
    return;
  }

  const { testamentData } = result;

  switch (typeOfInteraction) {
    case CanvasInteractions.Click:
      {
        if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
          BibleVizUtils.Functions.HighlightBiblePiece({
            data: testamentData,
          });
        } else {
          if (testament.tags.isHighlighted) {
            thisBot.SelectTestament({
              testament,
              source: "HandleTestamentInteraction",
            });
          } else {
            thisBot.TryHighlightPiece({
              piece: testament,
              highlightRequestSource: CanvasInteractions.Click,
              typeOfPiece: BiblePiece.StackTestament,
            });
          }
        }
      }
      break;
    case CanvasInteractions.Tap:
      {
        if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
          BibleVizUtils.Functions.HighlightBiblePiece({
            data: testamentData,
          });
        } else {
          thisBot.SelectTestament({
            testament,
            source: "HandleTestamentInteraction",
          });
        }
      }
      break;
  }
}

export async function HandleTestamentPointerEnter({
  testament,
}: BibleStackEvents["OnTestamentPointerEnter"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const result = await checkInitialSetup(testament);

  if (!result) {
    return;
  }

  thisBot.TryHighlightPiece({
    piece: testament,
    highlightRequestSource: CanvasInteractions.HoverBegin,
    typeOfPiece: BiblePiece.StackTestament,
  });
}

export async function HandleTestamentDrag({
  testament,
}: BibleStackEvents["OnTestamentDrag"]) {
  if (thisBot.masks.isBibleAnimating || !testament.tags.draggable) return;

  const result = await checkInitialSetup(testament);

  if (!result) {
    return;
  }

  const { testamentData } = result;

  shout("OnStackPieceDrag", {
    piece: testament,
    data: testamentData,
  });
}

export async function HandleTestamentDragging({
  testament,
  draggingEvent,
}: BibleStackEvents["OnTestamentDragging"]) {
  if (thisBot.masks.isBibleAnimating || !testament.tags.draggable) return;

  const result = await checkInitialSetup(testament);

  if (!result) {
    return;
  }

  shout("OnStackPieceDragging", { piece: testament, draggingEvent });
}

export async function HandleTestamentDrop({
  testament,
  dropEvent,
}: BibleStackEvents["OnTestamentDrop"]) {
  if (thisBot.masks.isBibleAnimating || !testament.tags.draggable) return;

  const result = await checkInitialSetup(testament);

  if (!result) {
    return;
  }

  shout("OnStackPieceDrop", { piece: testament, dropEvent });
}

export async function HandleTestamentPointerUp({
  testament,
}: BibleStackEvents["OnTestamentPointerUp"]) {
  if (!testament.tags.draggable) return;

  const result = await checkInitialSetup(testament);

  if (!result) {
    return;
  }

  shout("OnStackPiecePointerUp", { piece: testament });
}
