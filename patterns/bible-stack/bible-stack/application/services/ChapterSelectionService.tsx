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
import type {
  IndicatorsDeleterPort,
  IndicatorsUpdaterPort,
  NotificationDeleterPort,
} from "../ports/in/PieceActivity";

interface ServiceParams {
  loggerPort: LoggerPort;
  chapterSelectionAdapterPort: ChapterSelectionAdapterPort;
  indicatorsDeleterPort: IndicatorsDeleterPort;
  indicatorsUpdaterPort: IndicatorsUpdaterPort;
  notificationDeleterPort: NotificationDeleterPort;
  labelManagerPort: LabelManagerPort;
  versesBundleLifecycleAdapterPort: VersesBundleLifecycleAdapterPort;
}

// type TrySelectParams = {
//   data: StackChapterData;
// } | {
//   bookData: StackBookData | StackSectionBookData;
//   chapter: number
// }

export class ChapterSelectionService implements ChapterSelectionPort {
  #loggerPort: ServiceParams["loggerPort"];
  #chapterSelectionAdapterPort: ServiceParams["chapterSelectionAdapterPort"];
  #indicatorsDeleterPort: ServiceParams["indicatorsDeleterPort"];
  #indicatorsUpdaterPort: ServiceParams["indicatorsUpdaterPort"];
  #notificationDeleterPort: ServiceParams["notificationDeleterPort"];
  #labelManagerPort: ServiceParams["labelManagerPort"];
  #versesBundleLifecycleAdapterPort: ServiceParams["versesBundleLifecycleAdapterPort"];

  constructor({
    loggerPort,
    chapterSelectionAdapterPort,
    indicatorsDeleterPort,
    indicatorsUpdaterPort,
    notificationDeleterPort,
    labelManagerPort,
    versesBundleLifecycleAdapterPort,
  }: ServiceParams) {
    this.#loggerPort = loggerPort;
    this.#chapterSelectionAdapterPort = chapterSelectionAdapterPort;
    this.#indicatorsDeleterPort = indicatorsDeleterPort;
    this.#indicatorsUpdaterPort = indicatorsUpdaterPort;
    this.#notificationDeleterPort = notificationDeleterPort;
    this.#labelManagerPort = labelManagerPort;
    this.#versesBundleLifecycleAdapterPort = versesBundleLifecycleAdapterPort;
  }

  #prepareDeselection(data: StackChapterData) {
    this.#indicatorsDeleterPort.tryHideIndicators(data);
  }

  #finalizeDeselection(data: StackChapterData) {
    this.#indicatorsUpdaterPort.updateIndicators(data);

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
    }

    this.#prepareDeselection(data);
    await this.#chapterSelectionAdapterPort.deselect({ data });
    this.#finalizeDeselection(data);
    data.changeSelectionState("SequenceComplete");
  }

  async #prepareSelection(data: StackChapterData) {
    if (data.isOnTheGround) {
      this.#notificationDeleterPort.tryHideNotification(data);
      for (const bundleData of data.childrenData) {
        const bundle =
          this.#versesBundleLifecycleAdapterPort.spawnVersesBundleDomain();
        bundleData.setPiece(bundle);
      }
      await this.#labelManagerPort.hideLabel(data.piece!, "Instant");
    }
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

    await this.#prepareSelection(data);

    await this.#chapterSelectionAdapterPort.select({ data });

    data!.changeSelectionState("SequenceComplete");
  }
}
