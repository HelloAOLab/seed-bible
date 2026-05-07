import {
  BiblePiece,
  BibleState,
  type Piece,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import {
  HighlightEvents,
  HighlightStates,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/highlight";
import type {
  PieceHighlightServicePort as PiecesHighlightServicePort,
  PieceHighlightPieceDataRepositoryPort,
  PieceHighlightSequenceStateServicePort,
  PieceHighlightEventPort,
  PieceHighlightAdapterPort,
  PieceHighlightActivityNotificationAdapterPort,
  PieceHierarchyServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import type { PieceHighlightServicePort as ExperienceHighlightServicePort } from "../ports/experience";
import {
  type HighlightRequestSource,
  type HighlightPacing,
  type UnhighlightRequestSource,
  HighlightRequestSources,
} from "../../domain/models/pieces";
import type { LabelTranslucencyMode } from "bibleVizUtils.domain.models.label";

interface PieceHighlightServiceParams {
  eventPort: PieceHighlightEventPort;
  pieceHighlightAdapterPort: PieceHighlightAdapterPort;
  activityNotificationAdapterPort: PieceHighlightActivityNotificationAdapterPort;
  pieceDataRepositoryPort: PieceHighlightPieceDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  sequenceStateServicePort: PieceHighlightSequenceStateServicePort;
}

export class PieceHighlightService
  implements PiecesHighlightServicePort, ExperienceHighlightServicePort
{
  #scheduledUnhighlightsMap: Map<Piece["id"], string> = new Map();
  #highlightedPiecesIds: Map<
    Piece["id"],
    Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >
  > = new Map();
  #eventPort: PieceHighlightEventPort;
  #pieceHighlightAdapterPort: PieceHighlightAdapterPort;
  #activityNotificationAdapterPort: PieceHighlightActivityNotificationAdapterPort;
  #pieceDataRepositoryPort: PieceHighlightPieceDataRepositoryPort;
  #pieceHierarchyServicePort: PieceHierarchyServicePort;
  #sequenceStateServicePort: PieceHighlightSequenceStateServicePort;

  constructor({
    eventPort,
    pieceHighlightAdapterPort,
    activityNotificationAdapterPort,
    pieceDataRepositoryPort,
    pieceHierarchyServicePort,
    sequenceStateServicePort,
  }: PieceHighlightServiceParams) {
    this.#eventPort = eventPort;
    this.#pieceHighlightAdapterPort = pieceHighlightAdapterPort;
    this.#activityNotificationAdapterPort = activityNotificationAdapterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
  }

  isPieceHighlighted(id: Piece["id"]) {
    return this.#highlightedPiecesIds.has(id);
  }

  async tryHighlightPiece({
    piece,
    source,
    scheduledUnhighlightData,
    pacing = "Regular",
  }: {
    piece: Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >;
    source: HighlightRequestSource;
    scheduledUnhighlightData?: {
      delay: number;
      pacing?: HighlightPacing;
    };
    pacing?: HighlightPacing;
  }): Promise<void> {
    const data = this.#pieceDataRepositoryPort.getPieceData(piece);

    if (!data) {
      throw new Error(
        "PieceHighlightService: data not found at tryHighlightPiece."
      );
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      data.parentDataIds as StackParentDataIds
    );

    if (
      (this.#sequenceStateServicePort.isThereAnOngoingSequence() &&
        source !== HighlightRequestSources.Transition) ||
      (bibleData && bibleData.currentState !== BibleState.Open) ||
      !data.isHighlightable
    ) {
      return;
    }

    const isUnhighlightScheduled = this.isUnhighlightScheduled(piece);
    const prevState = data.highlightState;
    const transitioned = data.changeHighlightState(
      HighlightEvents.RequestHighlight
    );

    if (!transitioned) {
      if (isUnhighlightScheduled) {
        if (data.type === BiblePiece.StackBook) {
          this.changeHighlightIntensity({ piece, intensity: "Solid", pacing });
        }
        this.clearScheduledUnhighlight(piece);
      }
      return;
    }

    this.#highlightedPiecesIds.set(piece.id, piece);
    // TODO: Wire this event to the interaction registry and add this piece to the last interacted of its type
    this.#eventPort.emit("OnScripturePieceHighlighted", { pieceData: data });

    let highlightAction: Promise<void> | undefined = undefined;
    switch (prevState) {
      case HighlightStates.Unhighlighting:
        {
          this.#pieceHighlightAdapterPort.interruptSequence(piece);
          highlightAction = this.#pieceHighlightAdapterPort.rehighlight(
            piece,
            pacing
          );
        }
        break;
      case HighlightStates.Idle:
        {
          if (data.type === "StackChapter") {
            const activityNotification = data.detachActivityNotification();
            if (activityNotification) {
              this.#activityNotificationAdapterPort.hideNotification(
                activityNotification
              );
            }
          }
          highlightAction = this.#pieceHighlightAdapterPort.highlight(
            piece,
            pacing
          );
        }
        break;
    }

    if (
      data.type === BiblePiece.StackTestament &&
      data.getParentId("stackBibleId") &&
      source !== HighlightRequestSources.Transition
    ) {
      const piecesToUnhighlight = [
        ...this.#highlightedPiecesIds.values(),
      ].filter((currentPiece) => {
        const currData =
          this.#pieceDataRepositoryPort.getPieceData(currentPiece);
        if (!currData) {
          throw new Error(
            `PieceHighlightService: data not found at tryHighlightPiece`
          );
        }

        return (
          currData.type === BiblePiece.StackTestament &&
          currentPiece.id !== piece.id &&
          !currData.isOnTheGround &&
          currData.highlightState !== "Unhighlighting" &&
          data.getParentId("stackBibleId") ===
            currData.getParentId("stackBibleId")
        );
      });

      if (piecesToUnhighlight.length > 0) {
        piecesToUnhighlight.forEach((currPiece) => {
          this.tryUnhighlightPiece({
            piece: currPiece,
            pacing,
            source: "UserFocus", // TODO: Determine the right value for this
          });
        });
      }
    }

    await highlightAction;

    data.changeHighlightState("SequenceComplete");

    switch (source) {
      case HighlightRequestSources.UserFocus:
        if (!data.isFocused) {
          this.tryUnhighlightPiece({
            piece,
            source: "UserFocus",
            pacing: scheduledUnhighlightData?.pacing ?? "Regular",
            delay: 2000, // TODO: Move this to a config provider
          });
        }
        break;
      case HighlightRequestSources.UserSelection:
        if (scheduledUnhighlightData && !data.isFocused) {
          this.tryUnhighlightPiece({
            piece,
            source: "UserSelection",
            pacing: scheduledUnhighlightData?.pacing ?? "Regular",
            delay: scheduledUnhighlightData.delay,
          });
        }
        break;
      case HighlightRequestSources.UserBlur:
        if (scheduledUnhighlightData) {
          this.tryUnhighlightPiece({
            piece,
            source: "UserBlur",
            pacing: scheduledUnhighlightData?.pacing ?? "Regular",
            delay: scheduledUnhighlightData.delay,
          });
        }
        break;
      case HighlightRequestSources.Transition:
        {
          this.tryUnhighlightPiece({
            piece,
            source: "Transition",
            pacing: scheduledUnhighlightData?.pacing ?? "Regular",
            delay: scheduledUnhighlightData?.delay ?? 4000, // TODO: Move this to a config provider
          });
        }
        break;
    }
  }

  tryUnhighlightPiece: (params: {
    piece: Piece;
    source: UnhighlightRequestSource;
    pacing: HighlightPacing;
    delay?: number;
    duration?: number;
  }) => Promise<void> = ({ piece, source, pacing, delay, duration }) => {
    return Promise.resolve();
  };

  isUnhighlightScheduled(piece: Piece): boolean {
    return this.#scheduledUnhighlightsMap.has(piece.id);
  }

  changeHighlightIntensity({
    piece,
    intensity,
    pacing = "Regular",
  }: {
    piece: Piece;
    intensity: LabelTranslucencyMode;
    pacing?: HighlightPacing;
  }): void {}

  clearHighlightedPieces(): void {
    for (const piece of this.#highlightedPiecesIds.values()) {
      const data = this.#pieceDataRepositoryPort.getPieceData(piece);
      data?.changeHighlightState(HighlightEvents.RequestUnhighlight);
    }
    this.#highlightedPiecesIds.clear();
  }

  clearScheduledUnhighlight(piece: Piece) {
    if (this.isUnhighlightScheduled(piece)) {
      this.#scheduledUnhighlightsMap.delete(piece.id);

      // TODO: clear the timeout in the infrastructure layer with a proper adapter.
    }
  }

  clearScheduledUnhighlights(): void {}
}
