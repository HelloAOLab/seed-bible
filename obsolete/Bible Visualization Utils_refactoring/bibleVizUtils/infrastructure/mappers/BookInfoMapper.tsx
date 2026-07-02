import type {
  BookInfoConfig,
  ArrangementInfoConfig,
} from "bibleVizUtils.infrastructure.models.arrangement";
import type { BookInfo } from "bibleVizUtils.domain.models.arrangement";
import type { BooksStaticInfoRepository } from "bibleVizUtils.domain.ports.arrangement";
import type {
  ArrangementConfigProviderPort,
  CustomArrangementStorePort,
} from "bibleVizUtils.infrastructure.ports.bookInfo";

interface MapperParams {
  arrangementConfigProviderPort: ArrangementConfigProviderPort;
  customArrangementStorePort: CustomArrangementStorePort;
  booksStaticInfoRepository: BooksStaticInfoRepository;
}

export class BookInfoMapper {
  #arrangementConfigProviderPort: MapperParams["arrangementConfigProviderPort"];
  #customArrangementStorePort: MapperParams["customArrangementStorePort"];
  #booksStaticInfoRepository: MapperParams["booksStaticInfoRepository"];

  constructor({
    arrangementConfigProviderPort,
    customArrangementStorePort,
    booksStaticInfoRepository,
  }: MapperParams) {
    this.#arrangementConfigProviderPort = arrangementConfigProviderPort;
    this.#customArrangementStorePort = customArrangementStorePort;
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
    const { arrangementName, testamentIndex, sectionIndex, bookIndex } =
      info.path;

    const arrangementFinder = (arrangement: ArrangementInfoConfig) => {
      return arrangement.name === arrangementName;
    };

    const staticArrangements =
      this.#arrangementConfigProviderPort.getRawStaticArrangements();
    let foundArrangement = staticArrangements.find(arrangementFinder);

    if (!foundArrangement) {
      const customArrangements =
        this.#customArrangementStorePort.getRawArrangements();
      foundArrangement = customArrangements.find(arrangementFinder);
    }

    if (!foundArrangement) {
      throw new Error(
        `BookInfoMapper: foundArrangement not found at toInfrastructure`
      );
    }

    const infrastructureInfo =
      foundArrangement.testaments[testamentIndex]?.sections[sectionIndex]
        ?.books[bookIndex];

    if (!infrastructureInfo) {
      throw new Error(
        `BookInfoMapper: infrastructureInfo not found at toInfrastructure`
      );
    }

    return infrastructureInfo;
  }
}
