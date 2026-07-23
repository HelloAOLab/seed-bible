import type { BookChaptersManagementAdapterPort } from "../../../application/ports/out/BookChaptersManagement";
import type { BookInfo, ChapterInfo } from "../../../domain/models/arrangement";
import type { Piece } from "../../../domain/models/canvas";
import type { StackTransformer } from "../../../domain/models/pieces";
import type { LayoutConfigProvider } from "../../config/layout/LayoutConfigProvider";
import type { PiecesConfigProvider } from "../../config/pieces.tsx/PiecesConfigProvider";
import {
  ApplyStrictMod,
  GetBotScales,
  SetStrictTag,
} from "../../functions/casualos";
import type { StackBookMapper } from "../../mappers/StackBookMapper";
import type { StackChapterMapper } from "../../mappers/StackChapterMapper";
import type { StackSectionBookMapper } from "../../mappers/StackSectionBookMapper";
import type { StackTransformerMapper } from "../../mappers/StackTransformerMapper";
import type { ChapterTags } from "../../models/stack";
import type { VisualStateRegistry } from "./VisualStateRegistry";

interface AdapterParams {
  bookMapper: StackBookMapper;
  chapterMapper: StackChapterMapper;
  sectionBookMapper: StackSectionBookMapper;
  transformerMapper: StackTransformerMapper;
  layoutConfigProvider: LayoutConfigProvider;
  getDimension: () => string;
  visualStateRegistry: VisualStateRegistry;
  piecesConfigProvider: PiecesConfigProvider;
}

export class BookChapterManagementAdapter implements BookChaptersManagementAdapterPort {
  #bookMapper: AdapterParams["bookMapper"];
  #sectionBookMapper: AdapterParams["sectionBookMapper"];
  #layoutConfigProvider: AdapterParams["layoutConfigProvider"];
  #getDimension: AdapterParams["getDimension"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #piecesConfigProvider: AdapterParams["piecesConfigProvider"];
  #chapterMapper: AdapterParams["chapterMapper"];
  #transformerMapper: AdapterParams["transformerMapper"];

  constructor({
    bookMapper,
    sectionBookMapper,
    layoutConfigProvider,
    getDimension,
    visualStateRegistry,
    piecesConfigProvider,
    chapterMapper,
    transformerMapper,
  }: AdapterParams) {
    this.#bookMapper = bookMapper;
    this.#sectionBookMapper = sectionBookMapper;
    this.#layoutConfigProvider = layoutConfigProvider;
    this.#getDimension = getDimension;
    this.#visualStateRegistry = visualStateRegistry;
    this.#piecesConfigProvider = piecesConfigProvider;
    this.#chapterMapper = chapterMapper;
    this.#transformerMapper = transformerMapper;
  }

  setUpChapter({
    chapter,
    book,
    chapterInfo,
    bookInfo,
    isMovable,
    biggerChapter,
  }: {
    chapter: Piece<"StackChapter">;
    book: Piece<"StackBook"> | Piece<"StackSectionBook">;
    chapterInfo: ChapterInfo;
    bookInfo: BookInfo;
    isMovable: boolean;
    index: number;
    biggerChapter: number;
  }) {
    const bookBot =
      book.type === "StackBook"
        ? this.#bookMapper.toInfrastructure(book)
        : this.#sectionBookMapper.toInfrastructure(book);
    if (!bookBot) {
      throw new Error(
        "BookChaptersManagementAdapter: bookBot not found at setUpChapter"
      );
    }
    const chapterBot = this.#chapterMapper.toInfrastructure(chapter);
    if (!chapterBot) {
      throw new Error(
        "BookChaptersManagementAdapter: chapterBot not found at setUpChapter"
      );
    }

    const dimension = this.#getDimension();
    const chapterDeltaDepth =
      (bookBot.tags.scaleY -
        this.#layoutConfigProvider.getStackPieceMeasurement("ChapterPaddingY") *
          2 -
        this.#layoutConfigProvider.getStackPieceMeasurement(
          "MinChapterBackDepth"
        )) *
      (chapterInfo.amountOfVerses / biggerChapter);

    const chapterMod: Partial<ChapterTags> = {
      [dimension]: true,
      [dimension + "X"]: 0,
      [dimension + "Y"]: 0,
      [dimension + "Z"]: 0,
      draggable: isMovable,
      scaleX:
        this.#layoutConfigProvider.getStackPieceMeasurement("ChapterWidth"),
      scaleY:
        this.#layoutConfigProvider.getStackPieceMeasurement(
          "MinChapterBackDepth"
        ) + chapterDeltaDepth,
      scaleZ:
        this.#layoutConfigProvider.getStackPieceMeasurement("ChapterHeight"),
      label: String(
        chapterInfo.number +
          (bookInfo.type === "subset" ? bookInfo.startIndex : 0)
      ),
    };
    this.#visualStateRegistry.registerState({
      piece: chapter,
      state: {
        initialScaleX:
          this.#layoutConfigProvider.getStackPieceMeasurement("ChapterWidth"),
        initialScaleY:
          this.#layoutConfigProvider.getStackPieceMeasurement(
            "MinChapterBackDepth"
          ) + chapterDeltaDepth,
        initialScaleZ:
          this.#layoutConfigProvider.getStackPieceMeasurement("ChapterHeight"),
        selectedScaleY:
          this.#layoutConfigProvider.getStackPieceMeasurement(
            "MinChapterBackDepth"
          ) +
          chapterDeltaDepth +
          this.#layoutConfigProvider.getStackPieceMeasurement(
            "ChapterFrontSelectedDepth"
          ),
        selectedColor:
          this.#piecesConfigProvider.getInitialVisualState("StackChapter")
            .selectedColor!,
        expandedScaleZ: 1, // TODO: Where does this value come from?
        highlightedScaleZ: 1, // TODO: Where does this value come from?
        initialColor:
          chapterBot.tags.color ??
          this.#piecesConfigProvider.getInitialConfig("StackChapter").color!,
      },
    });

    ApplyStrictMod(chapterBot, chapterMod);
  }

  updateChaptersPosition({
    book,
    chapters,
    bibleTransformer,
  }: {
    book: Piece<"StackBook"> | Piece<"StackSectionBook">;
    chapters: { piece: Piece<"StackChapter">; isSelected: boolean }[];
    bibleTransformer: StackTransformer | null;
  }): void {
    if (chapters.length === 0) return;

    const bookBot =
      book.type === "StackBook"
        ? this.#bookMapper.toInfrastructure(book)
        : this.#sectionBookMapper.toInfrastructure(book);
    if (!bookBot) {
      throw new Error(
        "BookChaptersManagementAdapter: bookBot not found at updateChaptersPosition"
      );
    }

    const dimension = this.#getDimension();
    const bookPosition = getBotPosition(bookBot, dimension);
    const bookScales = GetBotScales(bookBot);

    // Books that live inside a bible are children of that bible's transformer,
    // so their own position is relative to it. Chapters are not children of
    // the transformer, so we add the transformer's world position to place
    // them correctly. Standalone books (no transformer) use a zero offset.
    const transformerBot = bibleTransformer
      ? this.#transformerMapper.toInfrastructure(bibleTransformer)
      : undefined;
    const transformerPosition = transformerBot
      ? getBotPosition(transformerBot, dimension)
      : null;

    const columns = this.#visualStateRegistry.getStateProperty({
      piece: book,
      property: "chapterColumns",
    });
    const rows = this.#visualStateRegistry.getStateProperty({
      piece: book,
      property: "chapterRows",
    });

    const chapterWidth =
      this.#layoutConfigProvider.getStackPieceMeasurement("ChapterWidth");
    const chapterHeight =
      this.#layoutConfigProvider.getStackPieceMeasurement("ChapterHeight");
    const chapterPaddingY =
      this.#layoutConfigProvider.getStackPieceMeasurement("ChapterPaddingY");
    const chapterFrontSelectedDepth =
      this.#layoutConfigProvider.getStackPieceMeasurement(
        "ChapterFrontSelectedDepth"
      );

    const horizontalChaptersSpace = chapterWidth * columns;
    const verticalChaptersSpace = chapterHeight * (rows - 1);
    const horizontalEmptySpace = bookScales.x - horizontalChaptersSpace;
    const verticalEmptySpace = bookScales.z - verticalChaptersSpace;
    const chapterHorizontalGap = horizontalEmptySpace / columns;
    const chapterVerticalGap = verticalEmptySpace / (rows - 1);

    let row = 0;
    let column = 0;
    for (const { piece: chapterPiece, isSelected } of chapters) {
      const chapterBot = this.#chapterMapper.toInfrastructure(chapterPiece);
      if (chapterBot) {
        const chapterScales = GetBotScales(chapterBot);
        const xPosition =
          (transformerPosition ? transformerPosition.x : 0) +
          bookPosition.x -
          bookScales.x / 2 +
          chapterWidth / 2 +
          chapterHorizontalGap / 2 +
          (chapterWidth + chapterHorizontalGap) * column;
        const yPosition =
          (transformerPosition ? transformerPosition.y : 0) +
          bookPosition.y -
          bookScales.y / 2 +
          chapterPaddingY +
          chapterScales.y / 2 -
          (isSelected ? chapterFrontSelectedDepth : 0);
        const zPosition =
          (transformerPosition ? transformerPosition.z + 1 : 0) +
          bookPosition.z +
          bookScales.z -
          chapterHeight -
          chapterVerticalGap / 2 -
          (chapterHeight + chapterVerticalGap) * row;
        SetStrictTag(
          chapterBot,
          (dimension + "X") as keyof ChapterTags,
          xPosition
        );
        SetStrictTag(
          chapterBot,
          (dimension + "Y") as keyof ChapterTags,
          yPosition
        );
        SetStrictTag(
          chapterBot,
          (dimension + "Z") as keyof ChapterTags,
          zPosition
        );
      }
      column++;
      if (column >= columns) {
        column = 0;
        row++;
      }
    }
  }
}
