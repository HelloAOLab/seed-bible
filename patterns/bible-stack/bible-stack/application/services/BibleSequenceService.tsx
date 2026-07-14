import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import type { BibleSequenceServicePort } from "../ports/in/BibleSequence";
import type { StackBibleData } from "../../domain/entities/StackBibleData";
import type {
  BibleSequenceEventPort,
  BibleSequenceAdapterPort,
  BibleSequenceServiceConfigProviderPort,
  LabelDataRepositoryPort,
  StackPieceLifecycleAdapterPort,
  PieceAdapterPort,
  BookChaptersManagementServicePort,
  RenderOrderAdapterPort,
  ScripturePiecesStateServicePort,
} from "../ports/bibleLifecycle";
import type { PieceDataRepositoryPort } from "../ports/pieces";
import type { AwaiterPort } from "../ports/experience";
import type { PieceLabelServicePort } from "../ports/pieces";
import {
  HighlightRequestSources,
  UnhighlightRequestSources,
  HighlightPacings,
} from "../../domain/models/pieces";
import {
  BibleTypes,
  BibleVisualizationStates,
  type Piece,
  type SectionShadow,
} from "../../domain/models/canvas";
import type { StackPresenceNavigationPacing } from "../../domain/models/userPresence";
import type { InfoLabelData } from "../../domain/entities/InfoLabelData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type { StackBookData } from "../../domain/entities/StackBookData";

interface BibleSequenceServiceParams {
  eventPort: BibleSequenceEventPort;
  bibleSequenceAdapterPort: BibleSequenceAdapterPort;
  scripturePiecesStateServicePort: ScripturePiecesStateServicePort;
  awaiterPort: AwaiterPort;
  configProviderPort: BibleSequenceServiceConfigProviderPort;
  pieceHighlightServicePort: PieceHighlighterPort;
  pieceLabelServicePort: PieceLabelServicePort;
  labelDataRepositoryPort: LabelDataRepositoryPort;
  pieceAdapterPort: PieceAdapterPort;
  stackPieceLifecycleAdapterPort: StackPieceLifecycleAdapterPort;
  bookChaptersManagementServicePort: BookChaptersManagementServicePort;
  renderOrderAdapterPort: RenderOrderAdapterPort;
  pieceDataRepositoryPort: Pick<
    PieceDataRepositoryPort,
    | "getAllTestaments"
    | "getAllSections"
    | "getAllSectionBooks"
    | "getAllBooks"
    | "getAllChapters"
  >;
}

export class BibleSequenceService implements BibleSequenceServicePort {
  #eventPort: BibleSequenceServiceParams["eventPort"];
  #bibleSequenceAdapterPort: BibleSequenceServiceParams["bibleSequenceAdapterPort"];
  #scripturePiecesStateServicePort: BibleSequenceServiceParams["scripturePiecesStateServicePort"];
  #awaiterPort: BibleSequenceServiceParams["awaiterPort"];
  #configProviderPort: BibleSequenceServiceParams["configProviderPort"];
  #pieceHighlightServicePort: BibleSequenceServiceParams["pieceHighlightServicePort"];
  #pieceLabelServicePort: BibleSequenceServiceParams["pieceLabelServicePort"];
  #labelDataRepositoryPort: BibleSequenceServiceParams["labelDataRepositoryPort"];
  #pieceAdapterPort: BibleSequenceServiceParams["pieceAdapterPort"];
  #stackPieceLifecycleAdapterPort: BibleSequenceServiceParams["stackPieceLifecycleAdapterPort"];
  #bookChaptersManagementServicePort: BibleSequenceServiceParams["bookChaptersManagementServicePort"];
  #renderOrderAdapterPort: BibleSequenceServiceParams["renderOrderAdapterPort"];
  #pieceDataRepositoryPort: BibleSequenceServiceParams["pieceDataRepositoryPort"];

  constructor({
    eventPort,
    bibleSequenceAdapterPort,
    scripturePiecesStateServicePort,
    awaiterPort,
    configProviderPort,
    pieceHighlightServicePort,
    pieceLabelServicePort,
    labelDataRepositoryPort,
    stackPieceLifecycleAdapterPort,
    pieceAdapterPort,
    bookChaptersManagementServicePort,
    renderOrderAdapterPort,
    pieceDataRepositoryPort,
  }: BibleSequenceServiceParams) {
    this.#eventPort = eventPort;
    this.#bibleSequenceAdapterPort = bibleSequenceAdapterPort;
    this.#scripturePiecesStateServicePort = scripturePiecesStateServicePort;
    this.#awaiterPort = awaiterPort;
    this.#configProviderPort = configProviderPort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
    this.#labelDataRepositoryPort = labelDataRepositoryPort;
    this.#stackPieceLifecycleAdapterPort = stackPieceLifecycleAdapterPort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#bookChaptersManagementServicePort = bookChaptersManagementServicePort;
    this.#renderOrderAdapterPort = renderOrderAdapterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
  }

  async resetBible({
    bibleData,
    pacing = "Regular",
  }: {
    bibleData: StackBibleData;
    pacing?: StackPresenceNavigationPacing;
  }): Promise<void> {
    this.#eventPort.emit("OnBibleResetSequenceStart", { bibleData });
    // TODO: Wire this event to the interaction registry to make this bible the last interacted
    // TODO: Wire this event to some sound service to call an quivalent to this -> thisBot.PlaySound({ soundName: "ResetBible" });

    await this.closeBible({
      bibleData,
      pacing,
    });
    await this.openBible({
      bibleData,
      pacing,
    });

    this.#eventPort.emit("OnBibleResetSequenceEnd", { bibleData });
  }

  async closeBible({
    bibleData,
    pacing = "Regular",
  }: {
    bibleData: StackBibleData;
    pacing?: StackPresenceNavigationPacing;
  }): Promise<void> {
    this.#eventPort.emit("OnBibleCloseSequenceStart", { bibleData });

    const { testamentsData, sectionsData, booksData } =
      bibleData.getActiveHierarchy();

    const testaments = testamentsData.flatMap((data) =>
      data.piece ? [data.piece] : []
    );
    const sections = sectionsData.flatMap((data) =>
      data.type === "StackSection" && data.isSplitIntoBooks
        ? []
        : data.piece
          ? [data.piece]
          : []
    );
    const books = booksData.flatMap((data) => (data.piece ? [data.piece] : []));
    const sectionShadows = sectionsData.flatMap((data) =>
      data.type === "StackSection" && data.shadow
        ? [data.detachShadow() as Piece<"StackSectionShadow">]
        : []
    );
    const selectedBooks: (Piece<"StackSectionBook"> | Piece<"StackBook">)[] = [
      ...sectionsData.flatMap((data) =>
        data.type === "StackSectionBook" &&
        data.selectionState === "Selected" &&
        data.piece
          ? [data.piece]
          : []
      ),
      ...booksData.flatMap((data) =>
        data.selectionState === "Selected" && data.piece ? [data.piece] : []
      ),
    ];
    const booksToHideChaptersData: (StackBookData | StackSectionBookData)[] = [
      ...(sectionsData.filter(
        (data) => data.type === "StackSectionBook" && data.isShowingChapters
      ) as StackSectionBookData[]),
      ...booksData.filter((data) => data.isShowingChapters),
    ];
    const lowerCover = bibleData.getStaticPiece("lowerCover");
    const upperCover = bibleData.getStaticPiece("upperCover");
    const verticalLine = bibleData.getStaticPiece("crossVerticalLine");
    const horizontalLine = bibleData.getStaticPiece("crossHorizontalLine");

    if (!upperCover) {
      throw new Error(
        `BibleSequenceService: upperCover not found at closeBible`
      );
    }
    if (!verticalLine) {
      throw new Error(
        `BibleSequenceService: verticalLine not found at closeBible`
      );
    }
    if (!horizontalLine) {
      throw new Error(
        `BibleSequenceService: horizontalLine not found at closeBible`
      );
    }
    if (!lowerCover) {
      throw new Error(
        "BibleSequenceService: lowerCover not found at closeBible"
      );
    }

    const selectedBooksLabelsData = selectedBooks
      .map((book) => {
        return this.#labelDataRepositoryPort.getDataByOwnerId(book.id);
      })
      .filter(Boolean) as InfoLabelData[];

    const scripturePieces = [...testaments, ...sections, ...books];
    const piecesToCollapse = [...scripturePieces, ...sectionShadows];

    for (const bookData of booksToHideChaptersData) {
      this.#bookChaptersManagementServicePort.hideChapters(bookData);
    }
    for (const piece of scripturePieces) {
      this.#pieceAdapterPort.makeNonInteractable(piece);
    }

    await Promise.allSettled([
      ...scripturePieces.map((piece) =>
        this.#pieceHighlightServicePort.tryUnhighlightPiece({
          piece,
          source: UnhighlightRequestSources.Transition,
          pacing: HighlightPacings.Instant,
        })
      ),
      ...selectedBooksLabelsData.map((labelData) =>
        this.#pieceLabelServicePort.hideLabel(labelData.owner, "Instant")
      ),
      ...sectionShadows.map((shadow) =>
        this.#pieceLabelServicePort.hideLabel(shadow, "Instant")
      ),
    ]);

    await this.#bibleSequenceAdapterPort.displayCloseBibleSequence({
      lowerCover,
      upperCover,
      verticalLine,
      horizontalLine,
      pacing,
      piecesToCollapse,
    });
    const piecesToRelease = bibleData.resetHierarchy();
    for (const piece of piecesToRelease) {
      switch (piece.type) {
        case "StackTestament":
          this.#stackPieceLifecycleAdapterPort.despawnTestament(
            piece as Piece<"StackTestament">
          );
          break;
        case "StackSection":
          this.#stackPieceLifecycleAdapterPort.despawnSection(
            piece as Piece<"StackSection">
          );
          break;
        case "StackSectionBook":
          this.#stackPieceLifecycleAdapterPort.despawnSectionBook(
            piece as Piece<"StackSectionBook">
          );
          break;
        case "StackBook":
          this.#stackPieceLifecycleAdapterPort.despawnBook(
            piece as Piece<"StackBook">
          );
          break;
        case "StackSectionShadow":
          this.#stackPieceLifecycleAdapterPort.despawnSectionShadow(
            piece as SectionShadow
          );
          break;
        default:
          throw new Error(
            `BibleSequenceService: Unrecognized piece type ${piece.type} at closeBible`
          );
      }
    }
    bibleData.changeState("Closed");
    this.#eventPort.emit("OnBibleCloseSequenceEnd", { bibleData });
  }

  async openBible({
    bibleData,
    pacing = "Regular",
  }: {
    bibleData: StackBibleData;
    pacing?: StackPresenceNavigationPacing;
  }): Promise<void> {
    this.#eventPort.emit("OnBibleOpenSequenceStart", { bibleData });

    const lowerCover = bibleData.getStaticPiece("lowerCover");
    const upperCover = bibleData.getStaticPiece("upperCover");
    const verticalLine = bibleData.getStaticPiece("crossVerticalLine");
    const horizontalLine = bibleData.getStaticPiece("crossHorizontalLine");

    if (!upperCover) {
      throw new Error(
        `BibleSequenceService: upperCover not found at openBible`
      );
    }
    if (!verticalLine) {
      throw new Error(
        `BibleSequenceService: verticalLine not found at openBible`
      );
    }
    if (!horizontalLine) {
      throw new Error(
        `BibleSequenceService: horizontalLine not found at openBible`
      );
    }
    if (!lowerCover) {
      throw new Error(
        "BibleSequenceService: lowerCover not found at openBible"
      );
    }

    bibleData.changeVizState(BibleVisualizationStates.Regular);

    for (const sectionData of bibleData.getAllSectionsData()) {
      if (sectionData.type === "StackSection") {
        sectionData.setPiece(
          this.#stackPieceLifecycleAdapterPort.spawnSectionDomain()
        );
      } else {
        sectionData.setPiece(
          this.#stackPieceLifecycleAdapterPort.spawnSectionBookDomain()
        );
      }
      sectionData.activate();
    }

    await this.#bibleSequenceAdapterPort.displayOpenBibleSequence({
      lowerCover,
      upperCover,
      verticalLine,
      horizontalLine,
      pacing,
      bibleData,
      arePiecesDraggable:
        this.#scripturePiecesStateServicePort.arePiecesDraggable,
    });

    for (const sectionData of bibleData.getAllSectionsData()) {
      sectionData.becomeHighlightable();
    }

    bibleData.changeState("Open");

    const activePieces = [
      ...this.#pieceDataRepositoryPort.getAllTestaments(),
      ...this.#pieceDataRepositoryPort.getAllSections(),
      ...this.#pieceDataRepositoryPort.getAllSectionBooks(),
      ...this.#pieceDataRepositoryPort.getAllBooks(),
      ...this.#pieceDataRepositoryPort.getAllChapters(),
    ]
      .filter((data) => data.isPieceAvailable())
      .flatMap((data) =>
        data.piece !== undefined &&
        this.#pieceAdapterPort.isPieceBeingUsed(data.piece)
          ? [data.piece]
          : []
      );
    this.#renderOrderAdapterPort.setSortedRenderOrder(activePieces);

    this.#eventPort.emit("OnBibleOpenSequenceEnd", { bibleData });

    return;
  }

  async crackOpenBible(bibleData: StackBibleData) {
    this.#eventPort.emit("OnBibleCrackOpenSequenceStart");
    bibleData.changeState("Open");
    bibleData.childrenData.forEach((testamentData) =>
      testamentData.attachToBible()
    );

    await this.#bibleSequenceAdapterPort.displayCrackOpenBibleSequence(
      bibleData,
      this.#scripturePiecesStateServicePort.arePiecesDraggable
    );

    bibleData.childrenData.forEach((testamentData) => {
      if (bibleData.bibleType === BibleTypes.Default) {
        testamentData.becomeHighlightable();
      } else {
        testamentData.becomeNonHighlightable();
      }
    });

    this.#eventPort.emit("OnBibleCrackOpenSequenceEnd");

    if (bibleData.bibleType !== BibleTypes.Default) return;

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
        scheduledUnhighlightData: {
          delay:
            this.#configProviderPort.getTestamentHighlightSequenceConfig(
              "unhighlightDelay"
            ),
        },
      });
      await this.#awaiterPort.sleep(
        this.#configProviderPort.getTestamentHighlightSequenceConfig(
          "staggerDelay"
        )
      );
    }
  }

  async float(): Promise<void> {
    // TODO: Should we translate/implement this?
    // const dimension = os.getCurrentDimension();
    // const animationDuration = 6;
    // animateTag(thisBot, dimension + "Z", null);
    // const initialPositionZ = thisBot.tags.initialPositionZ;
    // while (thisBot.masks.isInAwaitAnimation) {
    //   try {
    //     await animateTag(thisBot, dimension + "Z", {
    //       toValue: initialPositionZ + 0.5,
    //       duration: animationDuration / 4,
    //       easing: { type: "sinusoidal", mode: "out" },
    //     }).then(async () => {
    //       await animateTag(thisBot, dimension + "Z", {
    //         toValue: initialPositionZ - 0.5,
    //         duration: animationDuration / 2,
    //         easing: { type: "sinusoidal", mode: "inout" },
    //       }).then(async () => {
    //         await animateTag(thisBot, dimension + "Z", {
    //           toValue: initialPositionZ,
    //           duration: animationDuration / 4,
    //           easing: { type: "sinusoidal", mode: "in" },
    //         });
    //       });
    //     });
    //   } catch (error) {
    //     console.error(error);
    //   }
    // }
  }
}
