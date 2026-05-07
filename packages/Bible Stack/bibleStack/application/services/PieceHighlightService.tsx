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
  PieceHighlightActivityServicePort,
  PieceUnhighlightSchedulerAdapterPort,
  PieceHierarchyServicePort,
  StackParentDataIds,
  HighlightConfigProviderPort,
  AnyStackData,
} from "bibleStack.application.ports.pieces";
import { HighlightDelays } from "bibleStack.application.ports.pieces";
import type { PieceHighlightServicePort as ExperienceHighlightServicePort } from "../ports/experience";
import {
  type HighlightRequestSource,
  type HighlightPacing,
  type UnhighlightRequestSource,
  HighlightRequestSources,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";
import type { LabelTranslucencyMode } from "bibleVizUtils.domain.models.label";

interface PieceHighlightServiceParams {
  eventPort: PieceHighlightEventPort;
  pieceHighlightAdapterPort: PieceHighlightAdapterPort;
  activityNotificationAdapterPort: PieceHighlightActivityNotificationAdapterPort;
  pieceActivityServicePort: PieceHighlightActivityServicePort;
  schedulerAdapterPort: PieceUnhighlightSchedulerAdapterPort;
  configProviderPort: HighlightConfigProviderPort;
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
  #pieceActivityServicePort: PieceHighlightActivityServicePort;
  #schedulerAdapterPort: PieceUnhighlightSchedulerAdapterPort;
  #configProviderPort: HighlightConfigProviderPort;
  #pieceDataRepositoryPort: PieceHighlightPieceDataRepositoryPort;
  #pieceHierarchyServicePort: PieceHierarchyServicePort;
  #sequenceStateServicePort: PieceHighlightSequenceStateServicePort;

  constructor({
    eventPort,
    pieceHighlightAdapterPort,
    activityNotificationAdapterPort,
    pieceActivityServicePort,
    schedulerAdapterPort,
    configProviderPort,
    pieceDataRepositoryPort,
    pieceHierarchyServicePort,
    sequenceStateServicePort,
  }: PieceHighlightServiceParams) {
    this.#eventPort = eventPort;
    this.#pieceHighlightAdapterPort = pieceHighlightAdapterPort;
    this.#activityNotificationAdapterPort = activityNotificationAdapterPort;
    this.#pieceActivityServicePort = pieceActivityServicePort;
    this.#schedulerAdapterPort = schedulerAdapterPort;
    this.#configProviderPort = configProviderPort;
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
            delay: this.#configProviderPort.getDelay(
              HighlightDelays.UserFocusUnhighlightDelay
            ),
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
            delay:
              scheduledUnhighlightData?.delay ??
              this.#configProviderPort.getDelay(
                HighlightDelays.TransitionUnhighlightDelay
              ),
          });
        }
        break;
    }
  }

  async tryUnhighlightPiece({
    piece,
    source,
    pacing,
    delay,
  }: {
    piece: Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >;
    source: UnhighlightRequestSource;
    pacing: HighlightPacing;
    delay?: number;
  }): Promise<void> {
    const data = this.#pieceDataRepositoryPort.getPieceData(piece);
    if (!data) {
      throw new Error(
        "PieceHighlightService: data not found at tryUnhighlightPiece."
      );
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      data.parentDataIds as StackParentDataIds
    );

    if (
      (this.#sequenceStateServicePort.isThereAnOngoingSequence() &&
        source !== UnhighlightRequestSources.Transition) ||
      (bibleData && bibleData.currentState !== BibleState.Open) ||
      !data.isHighlightable
    ) {
      return;
    }

    const prevState = data.highlightState;
    const isUnhighlightScheduled = this.isUnhighlightScheduled(piece);

    if (prevState === HighlightStates.Unhighlighting) {
      if (source !== UnhighlightRequestSources.Transition) {
        return;
      }
      this.#pieceHighlightAdapterPort.interruptSequence(piece);
      if (isUnhighlightScheduled) {
        this.clearScheduledUnhighlight(piece);
      }
    } else {
      const transitioned = data.changeHighlightState(
        HighlightEvents.RequestUnhighlight
      );
      if (!transitioned) {
        return;
      }
      if (isUnhighlightScheduled) {
        this.clearScheduledUnhighlight(piece);
      }
    }

    if (delay) {
      const timerId = this.#schedulerAdapterPort.schedule(delay, async () => {
        this.#scheduledUnhighlightsMap.delete(piece.id);
        await this.#executeUnhighlight(piece, data, pacing);
      });
      this.#scheduledUnhighlightsMap.set(piece.id, timerId);
    } else {
      await this.#executeUnhighlight(piece, data, pacing);
    }
  }

  async #executeUnhighlight(
    piece: Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >,
    data: AnyStackData,
    pacing: HighlightPacing
  ): Promise<void> {
    this.#pieceHighlightAdapterPort.interruptSequence(piece);
    await this.#pieceHighlightAdapterPort.unhighlight(piece, pacing);
    data.changeHighlightState(HighlightEvents.SequenceComplete);
    this.#highlightedPiecesIds.delete(piece.id);
    if (data.type === BiblePiece.StackChapter) {
      this.#pieceActivityServicePort.updateNotification(data);
    }
  }

  isUnhighlightScheduled(piece: Piece): boolean {
    return this.#scheduledUnhighlightsMap.has(piece.id);
  }

  changeHighlightIntensity({
    piece,
    intensity,
    pacing = "Regular",
  }: {
    piece: Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >;
    intensity: LabelTranslucencyMode;
    pacing?: HighlightPacing;
  }): void {
    const data = this.#pieceDataRepositoryPort.getPieceData(piece);
    const changed = data?.changeHighlightIntensity(intensity);
    if (!changed) return;
    if (intensity === "Solid") {
      this.#pieceHighlightAdapterPort.increaseIntensity(piece, pacing);
    } else {
      this.#pieceHighlightAdapterPort.decreaseIntensity(piece);
    }
  }

  clearHighlightedPieces(): void {
    for (const piece of this.#highlightedPiecesIds.values()) {
      const data = this.#pieceDataRepositoryPort.getPieceData(piece);
      data?.changeHighlightState(HighlightEvents.RequestUnhighlight);
    }
    this.#highlightedPiecesIds.clear();
  }

  clearScheduledUnhighlight(piece: Piece) {
    const timerId = this.#scheduledUnhighlightsMap.get(piece.id);
    if (timerId !== undefined) {
      this.#schedulerAdapterPort.clear(timerId);
      this.#scheduledUnhighlightsMap.delete(piece.id);
    }
  }

  clearScheduledUnhighlights(): void {
    for (const timerId of this.#scheduledUnhighlightsMap.values()) {
      this.#schedulerAdapterPort.clear(timerId);
    }
    this.#scheduledUnhighlightsMap.clear();
  }
}
