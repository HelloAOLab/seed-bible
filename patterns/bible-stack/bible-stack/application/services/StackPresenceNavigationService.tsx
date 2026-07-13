import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackChapterData } from "../../domain/entities/StackChapterData";
import { PieceSelectionSources } from "../../domain/models/canvas";
import type { UserReadingInstance } from "../../domain/models/reading";
import type { ScripturePort } from "../ports/in/Scripture";
import type { BibleDataRepositoryPort } from "../ports/stacks";
import type {
  PieceDataRepositoryPort,
  PieceHierarchyServicePort,
  StackParentDataIds,
} from "../ports/pieces";
import type {
  PresenceProviderPort,
  PieceAdapterPort,
  SequenceStateServicePort,
  AwaiterPort,
  TestamentSelectionServicePort,
  ExplodedViewServicePort,
} from "../ports/userPresence";
import type { ChapterSelectionPort } from "../ports/in/ChapterSelection";
import { StackPresenceNavigationPacings } from "../../domain/models/userPresence";
import type { StackPresenceNavigationServicePort } from "../ports/experience";
import type { ArrangementServicePort } from "../ports/in/Arrangement";
import type {
  BookInfo,
  BookPathIndices,
} from "../../domain/models/arrangement";
import type { BibleSequenceServicePort } from "../ports/in/BibleSequence";
import type { BookSelectionServicePort } from "../ports/in/BookSelection";
import type { SectionSelectionServicePort } from "../ports/in/SectionSelection";

interface ServiceParams {
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  presenceProviderPort: PresenceProviderPort;
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: Pick<
    PieceDataRepositoryPort,
    "getAllChapters" | "getAllBooks" | "getAllSectionBooks"
  >;
  sequenceStateServicePort: SequenceStateServicePort;
  chapterSelectionServicePort: ChapterSelectionPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  scriptureServicePort: ScripturePort;
  bibleSequenceServicePort: BibleSequenceServicePort;
  bookSelectionServicePort: BookSelectionServicePort;
  awaiterPort: AwaiterPort;
  testamentSelectionServicePort: TestamentSelectionServicePort;
  sectionSelectionServicePort: SectionSelectionServicePort;
  explodedViewServicePort: ExplodedViewServicePort;
  arrangementServicePort: ArrangementServicePort;
}

interface NavigationTargets {
  chaptersToDeselect: StackChapterData[];
  chaptersToSelectDirectly: StackChapterData[];
  chapterToFocus: StackChapterData | undefined;
}

export class StackPresenceNavigationService implements StackPresenceNavigationServicePort {
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #presenceProviderPort: ServiceParams["presenceProviderPort"];
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #chapterSelectionServicePort: ServiceParams["chapterSelectionServicePort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #scriptureServicePort: ServiceParams["scriptureServicePort"];
  #bibleSequenceServicePort: ServiceParams["bibleSequenceServicePort"];
  #bookSelectionServicePort: ServiceParams["bookSelectionServicePort"];
  #awaiterPort: ServiceParams["awaiterPort"];
  #testamentSelectionServicePort: ServiceParams["testamentSelectionServicePort"];
  #sectionSelectionServicePort: ServiceParams["sectionSelectionServicePort"];
  #explodedViewServicePort: ServiceParams["explodedViewServicePort"];
  #isUpdateQueued: boolean = false;
  #isThereAnOngoingUpdate: boolean = false;
  #arrangementServicePort: ServiceParams["arrangementServicePort"];

  constructor({
    bibleDataRepositoryPort,
    presenceProviderPort,
    pieceAdapterPort,
    pieceDataRepositoryPort,
    sequenceStateServicePort,
    chapterSelectionServicePort,
    pieceHierarchyServicePort,
    scriptureServicePort,
    bibleSequenceServicePort,
    bookSelectionServicePort,
    awaiterPort,
    testamentSelectionServicePort,
    sectionSelectionServicePort,
    explodedViewServicePort,
    arrangementServicePort,
  }: ServiceParams) {
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#presenceProviderPort = presenceProviderPort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#chapterSelectionServicePort = chapterSelectionServicePort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#scriptureServicePort = scriptureServicePort;
    this.#bibleSequenceServicePort = bibleSequenceServicePort;
    this.#bookSelectionServicePort = bookSelectionServicePort;
    this.#awaiterPort = awaiterPort;
    this.#testamentSelectionServicePort = testamentSelectionServicePort;
    this.#sectionSelectionServicePort = sectionSelectionServicePort;
    this.#explodedViewServicePort = explodedViewServicePort;
    this.#arrangementServicePort = arrangementServicePort;
  }

  async update(): Promise<void> {
    const ativeReadingInstance = this.#presenceProviderPort.getActiveTab();

    const shouldQueue =
      this.#sequenceStateServicePort.isThereAnOngoingSequence() ||
      this.#isThereAnOngoingUpdate;
    if (
      this.#bibleDataRepositoryPort.getAllBiblesData().length === 0 ||
      !ativeReadingInstance ||
      shouldQueue
    ) {
      if (shouldQueue) this.#isUpdateQueued = true;
      return;
    }

    this.#isUpdateQueued = false;
    this.#isThereAnOngoingUpdate = true;

    const { chaptersToDeselect, chaptersToSelectDirectly, chapterToFocus } =
      this.#determineNavigationTargets(ativeReadingInstance);

    const animations: Promise<void>[] = [
      ...chaptersToSelectDirectly.map((data) =>
        this.#chapterSelectionServicePort.trySelectChapter({
          data,
          bookData: undefined,
        })
      ),
      ...chaptersToDeselect.map((data) =>
        this.#chapterSelectionServicePort.deselectChapter({ data })
      ),
    ];

    if (chapterToFocus) {
      animations.push(this.#navigateToChapter(chapterToFocus));
    }

    await (animations.length > 0
      ? Promise.all(animations)
      : this.#awaiterPort.sleep(1));

    this.#isThereAnOngoingUpdate = false;
    if (this.#isUpdateQueued) {
      this.update();
    }
  }

  #determineNavigationTargets(
    ativeReadingInstance: UserReadingInstance
  ): NavigationTargets {
    const chaptersToDeselect: StackChapterData[] = [];
    const chaptersToSelectDirectly: StackChapterData[] = [];
    let chapterToFocus: StackChapterData | undefined;
    const tempBookPathMap: Map<string, BookPathIndices> = new Map();
    const tempBookInfoMap: Map<string, BookInfo> = new Map();

    for (const chapterData of this.#pieceDataRepositoryPort.getAllChapters()) {
      let bookId = chapterData.getCreationParam("bookId");
      let chapter = chapterData.getPieceInfoProperty("number");
      let bookInfo = tempBookInfoMap.get(bookId);
      if (!bookInfo) {
        let bookPath = tempBookPathMap.get(bookId);
        if (!bookPath) {
          const tempPath = this.#arrangementServicePort.getBookInfoPathById({
            id: bookId,
          });
          if (tempPath.found) {
            bookPath = {
              arrangementIndex: tempPath.arrangementIndex,
              testamentIndex: tempPath.testamentIndex!,
              sectionIndex: tempPath.sectionIndex!,
              bookIndex: tempPath.bookIndex!,
            };
            tempBookPathMap.set(bookId, bookPath);
          }
        }
        if (!bookPath) {
          return {
            chaptersToDeselect: [],
            chaptersToSelectDirectly: [],
            chapterToFocus: undefined,
          };
        }
        const tempInfo =
          this.#arrangementServicePort.getBookByIndices(bookPath);
        if (tempInfo) {
          bookInfo = tempInfo;
          tempBookInfoMap.set(bookId, bookInfo);
        }
      }

      if (!bookInfo) {
        return {
          chaptersToDeselect: [],
          chaptersToSelectDirectly: [],
          chapterToFocus: undefined,
        };
      }

      if (bookInfo.type === "subset") {
        ({ bookId, chapter } =
          this.#scriptureServicePort.mapSubsetToCompleteBook({
            book: bookInfo,
            chapter,
          }));
      }

      const isAnimatable =
        chapterData.piece &&
        this.#pieceAdapterPort.isPieceBeingUsed(chapterData.piece);
      const isActiveChapter =
        ativeReadingInstance.bookId == bookId &&
        ativeReadingInstance.chapter == chapter;

      if (
        chapterData.isSelected &&
        isAnimatable &&
        !chapterData.isOnTheGround &&
        !isActiveChapter
      ) {
        chaptersToDeselect.push(chapterData);
      }

      if (isActiveChapter) {
        if (chapterData.getParentId("stackBibleId")) {
          chapterToFocus = chapterData;
        } else if (isAnimatable && !chapterData.isSelected) {
          chaptersToSelectDirectly.push(chapterData);
        }
      }
    }

    return { chaptersToDeselect, chaptersToSelectDirectly, chapterToFocus };
  }

  async #navigateToChapter(chapterToFocus: StackChapterData): Promise<void> {
    const { bibleData, testamentData, sectionData, sectionBookData, bookData } =
      this.#pieceHierarchyServicePort.getParentDataChain(
        chapterToFocus.parentDataIds as StackParentDataIds
      );

    const shouldResetStack =
      (!testamentData?.isActive || testamentData.isSplitIntoSections) &&
      (sectionBookData
        ? !sectionBookData.isActive ||
          sectionBookData.selectionState === "Selected"
        : (!sectionData?.isActive || sectionData.isSplitIntoBooks) &&
          (!bookData?.isActive || bookData.selectionState === "Selected")) &&
      !chapterToFocus.isActive &&
      !chapterToFocus.getParentId("stackBibleId");

    const pacingConditions = [!testamentData?.isSplitIntoSections];
    if (sectionBookData) {
      pacingConditions.push(sectionBookData.selectionState !== "Selected");
    } else {
      pacingConditions.push(
        !sectionData?.isSplitIntoBooks,
        !sectionData?.isInExplodedView,
        bookData?.selectionState !== "Selected"
      );
    }

    const pacing =
      shouldResetStack || pacingConditions.filter(Boolean).length > 1
        ? StackPresenceNavigationPacings.Double
        : StackPresenceNavigationPacings.Regular;

    const isBookToDeselect = (
      currBookData: StackBookData | StackSectionBookData
    ): boolean =>
      !!(
        currBookData.id !== bookData?.id &&
        currBookData.selectionState === "Selected" &&
        currBookData.lastInteractionSource ===
          PieceSelectionSources.StackPresenceNavigation
      );

    const bookToDeselectData =
      this.#pieceDataRepositoryPort.getAllBooks().find(isBookToDeselect) ??
      this.#pieceDataRepositoryPort.getAllSectionBooks().find(isBookToDeselect);

    // Step 1: Reset the stack or deselect a stale book before navigating
    if (shouldResetStack) {
      if (!bibleData) {
        throw new Error(
          "StackPresenceNavigationService: bibleData not defined at navigateToChapter"
        );
      }
      await this.#bibleSequenceServicePort.resetBible({ bibleData, pacing });
    } else if (bookToDeselectData) {
      await this.#bookSelectionServicePort.deselectBook(bookToDeselectData);
    } else {
      await this.#awaiterPort.sleep(1);
    }
    if (this.#isUpdateQueued) return;

    // Step 2: Select the testament that contains the target chapter
    if (testamentData && !testamentData.isSplitIntoSections) {
      await this.#testamentSelectionServicePort.selectTestament({
        data: testamentData,
        pacing,
        source: PieceSelectionSources.StackPresenceNavigation,
      });
    } else {
      await this.#awaiterPort.sleep(1);
    }
    if (this.#isUpdateQueued) return;

    // Step 3: Select the section book or drill into the section
    if (sectionBookData) {
      if (sectionBookData.selectionState !== "Selected") {
        await this.#bookSelectionServicePort.selectBook({
          data: sectionBookData,
          pacing: pacing === "Regular" ? "Regular" : "Fast",
          source: PieceSelectionSources.StackPresenceNavigation,
        });
      } else {
        await this.#awaiterPort.sleep(1);
      }
    } else if (sectionData) {
      if (!sectionData.isSplitIntoBooks) {
        await this.#sectionSelectionServicePort.select({
          data: sectionData,
          pacing,
          source: PieceSelectionSources.StackPresenceNavigation,
        });
      } else {
        await this.#awaiterPort.sleep(1);
      }
    } else {
      await this.#awaiterPort.sleep(1);
    }
    if (this.#isUpdateQueued) return;

    // Step 4: Expand the section into exploded view so individual books are reachable
    if (sectionData && !sectionData.isInExplodedView) {
      await this.#explodedViewServicePort.explodeSection({
        data: sectionData,
        pacing,
      });
    } else {
      await this.#awaiterPort.sleep(1);
    }
    if (this.#isUpdateQueued) return;

    // Step 5: Select the specific book that contains the target chapter
    if (bookData && bookData.selectionState !== "Selected") {
      await this.#bookSelectionServicePort.selectBook({
        data: bookData,
        pacing: pacing === "Regular" ? "Regular" : "Fast",
        source: PieceSelectionSources.StackPresenceNavigation,
      });
    } else {
      await this.#awaiterPort.sleep(1);
    }
    if (this.#isUpdateQueued) return;

    // Step 6: Select the chapter itself
    await this.#chapterSelectionServicePort.trySelectChapter({
      data: chapterToFocus,
      bookData,
    });
  }
}
