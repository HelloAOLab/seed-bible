import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type {
  BibleSequenceEventPort,
  BibleSequenceAdapterPort,
  BibleSequenceServiceConfigProviderPort,
} from "bibleStack.application.ports.bibleLifecycle";
import type {
  ScripturePiecesStateServicePort,
  AwaiterPort,
} from "bibleStack.application.ports.experience";
import type { PieceHighlightServicePort } from "bibleStack.application.ports.pieces";
import { HighlightRequestSources } from "bibleStack.domain.models.pieces";
import { BibleType } from "bibleVizUtils.domain.models.canvas";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";

interface BibleSequenceServiceParams {
  eventPort: BibleSequenceEventPort;
  bibleSequenceAdapterPort: BibleSequenceAdapterPort;
  scripturePiecesStateServicePort: ScripturePiecesStateServicePort;
  awaiterPort: AwaiterPort;
  configProviderPort: BibleSequenceServiceConfigProviderPort;
  pieceHighlightServicePort: PieceHighlightServicePort;
}

export class BibleSequenceService {
  #eventPort: BibleSequenceServiceParams["eventPort"];
  #bibleSequenceAdapterPort: BibleSequenceServiceParams["bibleSequenceAdapterPort"];
  #scripturePiecesStateServicePort: BibleSequenceServiceParams["scripturePiecesStateServicePort"];
  #awaiterPort: BibleSequenceServiceParams["awaiterPort"];
  #configProviderPort: BibleSequenceServiceParams["configProviderPort"];
  #pieceHighlightServicePort: BibleSequenceServiceParams["pieceHighlightServicePort"];

  constructor({
    eventPort,
    bibleSequenceAdapterPort,
    scripturePiecesStateServicePort,
    awaiterPort,
    configProviderPort,
    pieceHighlightServicePort,
  }: BibleSequenceServiceParams) {
    this.#eventPort = eventPort;
    this.#bibleSequenceAdapterPort = bibleSequenceAdapterPort;
    this.#scripturePiecesStateServicePort = scripturePiecesStateServicePort;
    this.#awaiterPort = awaiterPort;
    this.#configProviderPort = configProviderPort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
  }

  resetBible(_params: {
    bibleData: StackBibleData | undefined;
    pacing: StackPresenceNavigationPacing;
  }): Promise<void> {
    return Promise.resolve();
  }

  async crackOpenBible(bibleData: StackBibleData) {
    this.#eventPort.emit("OnBibleOpenSequenceBegin");
    bibleData.changeState("Open");
    bibleData.childrenData.forEach((testamentData) =>
      testamentData.attachToBible()
    );

    await this.#bibleSequenceAdapterPort.displayCrackOpenBibleSequence(
      bibleData,
      this.#scripturePiecesStateServicePort.arePiecesDraggable
    );

    bibleData.childrenData.forEach((testamentData) => {
      if (bibleData.bibleType === BibleType.Default) {
        testamentData.becomeHighlightable();
      } else {
        testamentData.becomeNonHighlightable();
      }
    });

    this.#eventPort.emit("OnBibleOpenSequenceEnd");

    if (bibleData.bibleType !== BibleType.Default) return;

    await this.#awaiterPort.sleep(
      this.#configProviderPort.getTestamentHighlightSequenceConfig(
        "initialDelay"
      )
    );
    for (const testamentData of bibleData.childrenData) {
      if (!testamentData.piece)
        throw new Error("testamentData.piece not found at crackOpenBible");
      await this.#pieceHighlightServicePort.tryHighlightPiece({
        piece: testamentData.piece,
        source: HighlightRequestSources.Transition,
        unhighlightDelay:
          this.#configProviderPort.getTestamentHighlightSequenceConfig(
            "unhighlightDelay"
          ),
      });
      await this.#awaiterPort.sleep(
        this.#configProviderPort.getTestamentHighlightSequenceConfig(
          "staggerDelay"
        )
      );
    }
  }
}
