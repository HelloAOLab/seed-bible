import {
  BiblePieces,
  BibleStates,
  type Piece,
  type PieceDataMap,
} from "../../domain/models/canvas";
import {
  HighlightEvents,
  HighlightIntensities,
  HighlightStates,
  type HighlightIntensity,
} from "../../domain/models/highlight";
import type {
  PieceHighlightPieceDataRepositoryPort,
  PieceHighlightSequenceStateServicePort,
  PieceHighlightEventPort,
  PieceHighlightAdapterPort,
  PieceHighlightActivityNotificationAdapterPort,
  PieceHighlightActivityServicePort,
  PieceHighlightLabelServicePort,
  PieceUnhighlightSchedulerAdapterPort,
  StackParentDataIds,
  HighlightConfigProviderPort,
  AnyStackData,
} from "../ports/pieces";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import { HighlightDelays } from "../ports/pieces";
import {
  type HighlightRequestSource,
  type HighlightPacing,
  type UnhighlightRequestSource,
  HighlightRequestSources,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";
import type { LoggerPort } from "../ports/out/Logger";

interface ServiceParams {
  eventPort: PieceHighlightEventPort;
  pieceHighlightAdapterPort: PieceHighlightAdapterPort;
  activityNotificationAdapterPort: PieceHighlightActivityNotificationAdapterPort;
  pieceActivityServicePort: PieceHighlightActivityServicePort;
  pieceLabelServicePort: PieceHighlightLabelServicePort;
  schedulerAdapterPort: PieceUnhighlightSchedulerAdapterPort;
  configProviderPort: HighlightConfigProviderPort;
  pieceDataRepositoryPort: PieceHighlightPieceDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  sequenceStateServicePort: PieceHighlightSequenceStateServicePort;
  loggerPort: LoggerPort;
}

export class PieceHighlightService implements PieceHighlighterPort {
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
  // Interrupted adapter sequences resolve instead of rejecting, so a superseded
  // attempt must check it is still the current one before touching state.
  #currentHighlightAttemptIds: Map<Piece["id"], number> = new Map();
  #lastHighlightAttemptId = 0;
  #eventPort: PieceHighlightEventPort;
  #pieceHighlightAdapterPort: PieceHighlightAdapterPort;
  #activityNotificationAdapterPort: PieceHighlightActivityNotificationAdapterPort;
  #pieceActivityServicePort: PieceHighlightActivityServicePort;
  #pieceLabelServicePort: PieceHighlightLabelServicePort;
  #schedulerAdapterPort: PieceUnhighlightSchedulerAdapterPort;
  #configProviderPort: HighlightConfigProviderPort;
  #pieceDataRepositoryPort: PieceHighlightPieceDataRepositoryPort;
  #pieceHierarchyServicePort: PieceHierarchyServicePort;
  #sequenceStateServicePort: PieceHighlightSequenceStateServicePort;
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    eventPort,
    pieceHighlightAdapterPort,
    activityNotificationAdapterPort,
    pieceActivityServicePort,
    pieceLabelServicePort,
    schedulerAdapterPort,
    configProviderPort,
    pieceDataRepositoryPort,
    pieceHierarchyServicePort,
    sequenceStateServicePort,
    loggerPort,
  }: ServiceParams) {
    this.#eventPort = eventPort;
    this.#pieceHighlightAdapterPort = pieceHighlightAdapterPort;
    this.#activityNotificationAdapterPort = activityNotificationAdapterPort;
    this.#pieceActivityServicePort = pieceActivityServicePort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
    this.#schedulerAdapterPort = schedulerAdapterPort;
    this.#configProviderPort = configProviderPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#loggerPort = loggerPort;
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
      this.#loggerPort.error(
        "PieceHighlightService: data not found at tryHighlightPiece."
      );
      return;
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      data.parentDataIds as StackParentDataIds
    );

    if (
      (this.#sequenceStateServicePort.isThereAnOngoingSequence() &&
        source !== HighlightRequestSources.Transition) ||
      (bibleData && bibleData.currentState !== BibleStates.Open) ||
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
        if (data.type === BiblePieces.StackBook) {
          this.changeHighlightIntensity({
            piece,
            intensity: HighlightIntensities.Solid,
            pacing,
          });
        }
        this.clearScheduledUnhighlight(piece);
      }
      return;
    }

    const attemptId = this.#beginHighlightAttempt(piece);
    data.changeHighlightIntensity(HighlightIntensities.Solid);

    this.#highlightedPiecesIds.set(piece.id, piece);
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
      data.type === BiblePieces.StackTestament &&
      data.getParentId("stackBibleId") &&
      source !== HighlightRequestSources.Transition
    ) {
      const piecesToUnhighlight = [
        ...this.#highlightedPiecesIds.values(),
      ].filter((currentPiece) => {
        const currData =
          this.#pieceDataRepositoryPort.getPieceData(currentPiece);
        if (!currData) {
          this.#loggerPort.error(
            `PieceHighlightService: data not found at tryHighlightPiece`
          );
          return false;
        }

        return (
          currData.type === BiblePieces.StackTestament &&
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
            source: UnhighlightRequestSources.Transition,
          });
        });
      }
    }

    await Promise.all([
      highlightAction,
      this.#pieceLabelServicePort.showLabel({
        piece,
        translucencyMode: "Solid",
      }),
    ]);

    if (!this.#tryEndHighlightAttempt(piece, attemptId)) return;

    data.changeHighlightState("SequenceComplete");

    switch (source) {
      case HighlightRequestSources.UserFocus:
        if (
          !data.isFocused &&
          data.type !== "StackBook" &&
          data.type !== "StackSectionBook"
        ) {
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
      this.#loggerPort.error(
        "PieceHighlightService: data not found at tryUnhighlightPiece."
      );
      return;
    }

    if (data.highlightState === HighlightStates.Idle) {
      return;
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      data.parentDataIds ?? {}
    );

    if (
      (this.#sequenceStateServicePort.isThereAnOngoingSequence() &&
        source !== UnhighlightRequestSources.Transition) ||
      (bibleData && bibleData.currentState !== BibleStates.Open) ||
      !data.isHighlightable
    ) {
      return;
    }

    const isRunning = data.highlightState === HighlightStates.Unhighlighting;
    const isScheduled = this.isUnhighlightScheduled(piece);

    if (source !== UnhighlightRequestSources.Transition) {
      if (isRunning || isScheduled) {
        return;
      }
    } else {
      if (isRunning) {
        this.#pieceHighlightAdapterPort.interruptSequence(piece);
      }
      if (isScheduled) {
        this.clearScheduledUnhighlight(piece);
      }
    }

    try {
      if (delay) {
        const timerId = this.#schedulerAdapterPort.schedule(delay, async () => {
          this.#scheduledUnhighlightsMap.delete(piece.id);
          await this.#executeUnhighlight(piece, data, pacing);
        });
        this.#scheduledUnhighlightsMap.set(piece.id, timerId);
      } else {
        await this.#executeUnhighlight(piece, data, pacing);
      }
    } catch (error) {
      this.#loggerPort.error(
        "PieceHighlightService: Error executing unhighlight sequence at tryUnhighlightPiece",
        { error }
      );
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
    const attemptId = this.#beginHighlightAttempt(piece);
    const previousState = data.highlightState;
    data.changeHighlightState(HighlightEvents.RequestUnhighlight);
    if (
      previousState === HighlightStates.Highlighting ||
      previousState === HighlightStates.Unhighlighting
    ) {
      this.#pieceHighlightAdapterPort.interruptSequence(piece);
    }
    try {
      await Promise.all([
        this.#pieceHighlightAdapterPort.unhighlight(piece, pacing),
        this.#pieceLabelServicePort.hideLabel(piece, pacing),
      ]);
      if (!this.#tryEndHighlightAttempt(piece, attemptId)) return;
      data.changeHighlightState(HighlightEvents.SequenceComplete);
      this.#highlightedPiecesIds.delete(piece.id);
      if (data.type === BiblePieces.StackChapter) {
        this.#pieceActivityServicePort.updateNotification(data);
      }
    } catch (error) {
      this.#loggerPort.error(
        "PieceHighlightService: Error executing unhighlight sequence at executeUnhighlight.",
        { error }
      );
      if (!this.#tryEndHighlightAttempt(piece, attemptId)) return;
      data.changeHighlightState(HighlightEvents.RequestHighlight);
      data.changeHighlightState(HighlightEvents.SequenceComplete);
    }
  }

  #beginHighlightAttempt(piece: Piece): number {
    const attemptId = ++this.#lastHighlightAttemptId;
    this.#currentHighlightAttemptIds.set(piece.id, attemptId);
    return attemptId;
  }

  #tryEndHighlightAttempt(piece: Piece, attemptId: number): boolean {
    if (this.#currentHighlightAttemptIds.get(piece.id) !== attemptId) {
      return false;
    }
    this.#currentHighlightAttemptIds.delete(piece.id);
    return true;
  }

  isUnhighlightScheduled(piece: Piece): boolean {
    return this.#scheduledUnhighlightsMap.has(piece.id);
  }

  changeHighlightIntensity({
    piece,
    intensity,
    pacing = "Regular",
  }: {
    piece: Piece<keyof PieceDataMap>;
    intensity: HighlightIntensity;
    pacing?: HighlightPacing;
  }): void {
    const data = this.#pieceDataRepositoryPort.getPieceData(piece);
    const changed = data?.changeHighlightIntensity(intensity);
    if (!changed) return;
    if (intensity === HighlightIntensities.Solid) {
      this.#pieceHighlightAdapterPort.increaseIntensity(piece, pacing);
    } else {
      this.#pieceHighlightAdapterPort.decreaseIntensity(piece);
    }
    void this.#pieceLabelServicePort.changeIntensity(piece, intensity, pacing);
  }

  async unhighlightBiblePieces(
    bibleId: string,
    pacing: HighlightPacing = "Regular"
  ): Promise<void> {
    const piecesToUnhighlight = [...this.#highlightedPiecesIds.values()].filter(
      (piece) => {
        const data = this.#pieceDataRepositoryPort.getPieceData(piece);
        return (
          !!data &&
          data.getParentId("stackBibleId") === bibleId &&
          !data.isOnTheGround &&
          data.highlightState !== HighlightStates.Unhighlighting
        );
      }
    );

    await Promise.all(
      piecesToUnhighlight.map((piece) =>
        this.tryUnhighlightPiece({
          piece,
          source: UnhighlightRequestSources.Transition,
          pacing,
        })
      )
    );
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

  forgetPiece(piece: Piece): void {
    this.clearScheduledUnhighlight(piece);
    this.#highlightedPiecesIds.delete(piece.id);
  }

  clearScheduledUnhighlights(): void {
    for (const timerId of this.#scheduledUnhighlightsMap.values()) {
      this.#schedulerAdapterPort.clear(timerId);
    }
    this.#scheduledUnhighlightsMap.clear();
  }
}
