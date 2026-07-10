import type {
  BookInfoConfig,
  ArrangementInfoConfig,
} from "../models/arrangement";
import type { BookInfo } from "../../domain/models/arrangement";
import type { BooksStaticInfoRepositoryPort } from "../ports/bookInfo";

interface MapperParams {
  getArrangement: () => ArrangementInfoConfig | undefined;
  booksStaticInfoRepository: BooksStaticInfoRepositoryPort;
}

export class BookInfoMapper {
  #getArrangement: MapperParams["getArrangement"];
  #booksStaticInfoRepository: MapperParams["booksStaticInfoRepository"];

  constructor({ getArrangement, booksStaticInfoRepository }: MapperParams) {
    this.#getArrangement = getArrangement;
    this.#booksStaticInfoRepository = booksStaticInfoRepository;
  }

  toDomain(info: BookInfoConfig, path: BookInfo["path"]): BookInfo {
    if (info.type === "complete") {
      const staticInfo = this.#booksStaticInfoRepository.getBookStaticInfo(
        info.bookId
      );
      if (!staticInfo)
        throw new Error(
          `BookInfoMapper: staticInfo not found for ${info.bookId}`
        );
      return {
        type: "complete",
        bookId: info.bookId,
        author: staticInfo.author,
        chaptersVerseCount: staticInfo.chaptersVerseCount,
        relativeDateRange: staticInfo.relativeDateRange,
        numberOfChapters: staticInfo.numberOfChapters,
        customColor: info.customColor,
        customLabelColor: info.customLabelColor,
        isCheckpoint: info.isCheckpoint,
        group: info.group,
        path,
      };
    }

    const completeStaticInfo =
      this.#booksStaticInfoRepository.getBookStaticInfo(info.completeBookId);
    if (!completeStaticInfo)
      throw new Error(
        `BookInfoMapper: staticInfo not found for ${info.completeBookId}`
      );
    const startIndex = info.startIndex ?? 0;
    const endIndex = info.endIndex ?? completeStaticInfo.numberOfChapters - 1;
    const chaptersVerseCount = completeStaticInfo.chaptersVerseCount.slice(
      startIndex,
      endIndex + 1
    );
    return {
      type: "subset",
      bookId: info.bookId,
      completeBookId: info.completeBookId,
      startIndex: info.startIndex,
      endIndex: info.endIndex,
      translationRule: info.translationRule,
      author: completeStaticInfo.author,
      chaptersVerseCount,
      relativeDateRange: completeStaticInfo.relativeDateRange,
      numberOfChapters: chaptersVerseCount.length,
      customColor: info.customColor,
      customLabelColor: info.customLabelColor,
      isCheckpoint: info.isCheckpoint,
      group: info.group,
      path,
    };
  }

  toInfrastructure(info: BookInfo): BookInfoConfig {
    const { testamentIndex, sectionIndex, bookIndex } = info.path;

    const arrangement = this.#getArrangement();
    if (!arrangement) {
      throw new Error(
        `BookInfoMapper: arrangement not found at toInfrastructure`
      );
    }

    const infrastructureInfo =
      arrangement.testaments[testamentIndex]?.sections[sectionIndex]?.books[
        bookIndex
      ];

    if (!infrastructureInfo) {
      throw new Error(
        `BookInfoMapper: infrastructureInfo not found at toInfrastructure`
      );
    }

    return infrastructureInfo;
  }
}
