import type { StackChapterData } from "../../domain/entities/StackChapterData";
import type {
  ChapterSelectionPort,
  DirectSelectionParams,
  TrySelectChapterParams,
} from "../ports/in/ChapterSelection";
import type { LoggerPort } from "../ports/in/Logger";
import type {
  ChapterSelectionAdapterPort,
  LabelManagerPort,
  VersesBundleLifecycleAdapterPort,
} from "../ports/out/ChapterSelection";
import type { PieceActivityServicePort } from "../ports/in/PieceActivity";

interface ServiceParams {
  loggerPort: LoggerPort;
  chapterSelectionAdapterPort: ChapterSelectionAdapterPort;
  pieceActivityServicePort: PieceActivityServicePort;
  labelManagerPort: LabelManagerPort;
  versesBundleLifecycleAdapterPort: VersesBundleLifecycleAdapterPort;
}

export class ChapterSelectionService implements ChapterSelectionPort {
  #loggerPort: ServiceParams["loggerPort"];
  #chapterSelectionAdapterPort: ServiceParams["chapterSelectionAdapterPort"];
  #pieceActivityServicePort: ServiceParams["pieceActivityServicePort"];
  #labelManagerPort: ServiceParams["labelManagerPort"];
  #versesBundleLifecycleAdapterPort: ServiceParams["versesBundleLifecycleAdapterPort"];

  constructor({
    loggerPort,
    chapterSelectionAdapterPort,
    pieceActivityServicePort,
    labelManagerPort,
    versesBundleLifecycleAdapterPort,
  }: ServiceParams) {
    this.#loggerPort = loggerPort;
    this.#chapterSelectionAdapterPort = chapterSelectionAdapterPort;
    this.#pieceActivityServicePort = pieceActivityServicePort;
    this.#labelManagerPort = labelManagerPort;
    this.#versesBundleLifecycleAdapterPort = versesBundleLifecycleAdapterPort;
  }

  #prepareDeselection(data: StackChapterData) {
    this.#pieceActivityServicePort.tryHideIndicators(data);
  }

  #despawnBundles(data: StackChapterData) {
    for (const bundleData of data.childrenData) {
      const piece = bundleData.clearPiece();
      for (const verseData of bundleData.verses) {
        const verse = verseData.clearPiece();
        if (verse) {
          this.#versesBundleLifecycleAdapterPort.despawnVerse(verse);
        }
      }
      if (piece) {
        this.#versesBundleLifecycleAdapterPort.despawnVersesBundle(piece);
      }
    }
  }

  #finalizeDeselection(data: StackChapterData) {
    this.#pieceActivityServicePort.updateIndicators(data);
    this.#despawnBundles(data);
  }

  async deselectChapter({ data }: DirectSelectionParams): Promise<void> {
    if (!data.piece) {
      this.#loggerPort.error(
        "ChapterSelectionService: data.piece not defined at deselectChapter"
      );
      return;
    }
    const deselecting = data.changeSelectionState("RequestDeselect");

    if (!deselecting) {
      this.#loggerPort.warn(
        "ChapterSelectionService: chapter is not deselecting at deselectChapter"
      );
      return;
    }

    try {
      this.#prepareDeselection(data);
      await this.#chapterSelectionAdapterPort.deselect({ data });
      this.#finalizeDeselection(data);
      data.changeSelectionState("SequenceComplete");
    } catch (error) {
      this.#loggerPort.error(
        "ChapterSelectionService: Error at deselectChapter",
        error
      );
      this.#handleDeselectionFail(data);
    }
  }

  async #prepareSelection(data: StackChapterData) {
    if (data.isOnTheGround) {
      this.#pieceActivityServicePort.tryHideNotification(data);
      for (const bundleData of data.childrenData) {
        const bundle =
          this.#versesBundleLifecycleAdapterPort.spawnVersesBundleDomain();
        bundleData.setPiece(bundle);
      }
      await this.#labelManagerPort.hideLabel(data.piece!, "Instant");
    }
  }

  /**
   * Aborts a selection that never reached its end, walking the chapter out of
   * the transient `Selecting` state so it stays interactable. Chapters that
   * already settled keep their state.
   */
  async #handleSelectionFail(data: StackChapterData) {
    if (data.selectionState !== "Selecting") return;
    data.changeSelectionState("RequestDeselect");
    data.changeSelectionState("SequenceComplete");

    if (!data.isOnTheGround) return;

    this.#despawnBundles(data);
    this.#pieceActivityServicePort.updateNotification(data);

    try {
      await this.#labelManagerPort.showLabel({
        piece: data.piece!,
        translucencyMode: "Solid",
        pacing: "Instant",
      });
    } catch (error) {
      this.#loggerPort.error(
        "ChapterSelectionService: showLabel failed at handleSelectionFail",
        error
      );
    }
  }

  /**
   * Aborts a deselection that never reached its end, walking the chapter back
   * into `Selected` and restoring the indicators the pre-flight hid. Chapters
   * that already settled keep their state.
   */
  #handleDeselectionFail(data: StackChapterData) {
    if (data.selectionState !== "Deselecting") return;
    data.changeSelectionState("RequestSelect");
    data.changeSelectionState("SequenceComplete");
    this.#pieceActivityServicePort.updateIndicators(data);
  }

  async trySelectChapter(params: TrySelectChapterParams): Promise<void> {
    let data: StackChapterData | undefined;
    if ("data" in params) {
      data = params.data;
    } else {
      data = params.bookData.getActiveChildrenByNumber(params.chapter);
    }
    if (!data) {
      this.#loggerPort.error(
        "ChapterSelectionService: data not found at trySelectChapter"
      );
      return;
    }

    const selecting = data.changeSelectionState("RequestSelect");

    if (!selecting) {
      this.#loggerPort.warn(
        "ChapterSelectionService: chapter is not deselecting at deselectChapter"
      );
      return;
    }

    try {
      await this.#prepareSelection(data);

      await this.#chapterSelectionAdapterPort.select({ data });

      data.changeSelectionState("SequenceComplete");
    } catch (error) {
      this.#loggerPort.error(
        "ChapterSelectionService: Error at trySelectChapter",
        error
      );
      await this.#handleSelectionFail(data);
    }
  }
}
