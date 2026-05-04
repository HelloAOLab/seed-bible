import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import { PieceSelectionSources } from "bibleVizUtils.domain.models.canvas";
import type { Tab } from "bibleVizUtils.domain.models.seedBible";
import type { ScriptureServicePort } from "bibleStack.application.ports.scripture";
import type { BibleDataRepositoryPort } from "bibleStack.application.ports.stacks";
import type {
  PieceDataRepositoryPort,
  PieceHierarchyServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import type {
  PresenceProviderPort,
  PieceAdapterPort,
  SequenceStateServicePort,
  BibleSequenceServicePort,
  BookSelectionServicePort,
  AwaiterPort,
  TestamentSelectionServicePort,
  SectionSelectionServicePort,
  ExplodedViewServicePort,
} from "bibleStack.application.ports.userPresence";
import type { ChapterSelectionServicePort } from "bibleStack.application.ports.chapters";
import type { BookName } from "bibleVizUtils.domain.models.scripture";
import { StackPresenceNavigationPacings } from "bibleStack.domain.models.userPresence";
import type { StackPresenceNavigationPort } from "bibleStack.application.ports.experience";

interface StackPresenceNavigationServiceParams {
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  presenceProviderPort: PresenceProviderPort;
  pieceAdapterPort: PieceAdapterPort;
  pieceDataRepositoryPort: Pick<
    PieceDataRepositoryPort,
    "getAllChapters" | "getAllBooks" | "getAllSectionBooks"
  >;
  sequenceStateServicePort: SequenceStateServicePort;
  chapterSelectionServicePort: Pick<
    ChapterSelectionServicePort,
    "trySelectChapter" | "deselectChapter"
  >;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  scriptureServicePort: ScriptureServicePort;
  bibleSequenceServicePort: BibleSequenceServicePort;
  bookSelectionServicePort: BookSelectionServicePort;
  awaiterPort: AwaiterPort;
  testamentSelectionServicePort: TestamentSelectionServicePort;
  sectionSelectionServicePort: SectionSelectionServicePort;
  explodedViewServicePort: ExplodedViewServicePort;
}

interface NavigationTargets {
  chaptersToDeselect: StackChapterData[];
  chaptersToSelectDirectly: StackChapterData[];
  chapterToFocus: StackChapterData | undefined;
}

export class StackPresenceNavigationService implements StackPresenceNavigationPort {
  #bibleDataRepositoryPort: StackPresenceNavigationServiceParams["bibleDataRepositoryPort"];
  #presenceProviderPort: StackPresenceNavigationServiceParams["presenceProviderPort"];
  #pieceAdapterPort: StackPresenceNavigationServiceParams["pieceAdapterPort"];
  #pieceDataRepositoryPort: StackPresenceNavigationServiceParams["pieceDataRepositoryPort"];
  #sequenceStateServicePort: StackPresenceNavigationServiceParams["sequenceStateServicePort"];
  #chapterSelectionServicePort: StackPresenceNavigationServiceParams["chapterSelectionServicePort"];
  #pieceHierarchyServicePort: StackPresenceNavigationServiceParams["pieceHierarchyServicePort"];
  #scriptureServicePort: StackPresenceNavigationServiceParams["scriptureServicePort"];
  #bibleSequenceServicePort: StackPresenceNavigationServiceParams["bibleSequenceServicePort"];
  #bookSelectionServicePort: StackPresenceNavigationServiceParams["bookSelectionServicePort"];
  #awaiterPort: StackPresenceNavigationServiceParams["awaiterPort"];
  #testamentSelectionServicePort: StackPresenceNavigationServiceParams["testamentSelectionServicePort"];
  #sectionSelectionServicePort: StackPresenceNavigationServiceParams["sectionSelectionServicePort"];
  #explodedViewServicePort: StackPresenceNavigationServiceParams["explodedViewServicePort"];
  #isUpdateQueued: boolean = false;
  #isThereAnOngoingUpdate: boolean = false;

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
  }: StackPresenceNavigationServiceParams) {
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
  }

  async update(): Promise<void> {
    const activeTab = this.#presenceProviderPort.getActiveTab();

    const shouldQueue =
      this.#sequenceStateServicePort.isThereAnOngoingSequence() ||
      this.#isThereAnOngoingUpdate;
    if (
      this.#bibleDataRepositoryPort.getAllBiblesData().length === 0 ||
      !activeTab ||
      shouldQueue
    ) {
      if (shouldQueue) this.#isUpdateQueued = true;
      return;
    }

    this.#isUpdateQueued = false;
    this.#isThereAnOngoingUpdate = true;

    const { chaptersToDeselect, chaptersToSelectDirectly, chapterToFocus } =
      this.#determineNavigationTargets(activeTab);

    const animations: Promise<void>[] = [
      ...chaptersToSelectDirectly.map((data) =>
        this.#chapterSelectionServicePort.trySelectChapter({
          data,
          bookData: undefined,
        })
      ),
      ...chaptersToDeselect.map((data) =>
        this.#chapterSelectionServicePort.deselectChapter(data)
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

  #determineNavigationTargets(activeTab: Tab): NavigationTargets {
    const chaptersToDeselect: StackChapterData[] = [];
    const chaptersToSelectDirectly: StackChapterData[] = [];
    let chapterToFocus: StackChapterData | undefined;

    for (const chapterData of this.#pieceDataRepositoryPort.getAllChapters()) {
      let book: BookName | "Psalms" = chapterData.getCreationParam("bookName");
      let chapter = chapterData.getPieceInfoProperty("number");
      if (book.includes("Psalms")) {
        ({ chapter } =
          this.#scriptureServicePort.convertDividedPsalmsToComplete({
            book,
            chapter,
          }));
        book = "Psalms";
      }

      const isAnimatable =
        chapterData.piece &&
        this.#pieceAdapterPort.isPieceBeingUsed(chapterData.piece);
      const isActiveChapter =
        activeTab.data.book == book && activeTab.data.chapter == chapter;

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
        ? !sectionBookData.isActive || sectionBookData.isSelected
        : (!sectionData?.isActive || sectionData.isSplitIntoBooks) &&
          (!bookData?.isActive || bookData.isSelected)) &&
      !chapterToFocus.isActive &&
      !chapterToFocus.getParentId("stackBibleId");

    const pacingConditions = [!testamentData?.isSplitIntoSections];
    if (sectionBookData) {
      pacingConditions.push(!sectionBookData.isSelected);
    } else {
      pacingConditions.push(
        !sectionData?.isSplitIntoBooks,
        !sectionData?.isInExplodedView,
        !bookData?.isSelected
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
        currBookData.isSelected &&
        currBookData.lastInteractionSource ===
          PieceSelectionSources.StackPresenceNavigation
      );

    const bookToDeselectData =
      this.#pieceDataRepositoryPort.getAllBooks().find(isBookToDeselect) ??
      this.#pieceDataRepositoryPort.getAllSectionBooks().find(isBookToDeselect);

    // Step 1: Reset the stack or deselect a stale book before navigating
    if (shouldResetStack) {
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
      if (!sectionBookData.isSelected) {
        await this.#bookSelectionServicePort.selectBook({
          data: sectionBookData,
          pacing,
          source: PieceSelectionSources.StackPresenceNavigation,
        });
      } else {
        await this.#awaiterPort.sleep(1);
      }
    } else if (sectionData) {
      if (!sectionData.isSplitIntoBooks) {
        await this.#sectionSelectionServicePort.selectSection({
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
    if (bookData && !bookData.isSelected) {
      await this.#bookSelectionServicePort.selectBook({
        data: bookData,
        pacing,
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
