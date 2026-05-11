import type {
  BookInfo as InfrastructureBookInfo,
  ArrangementInfo,
} from "bibleVizUtils.infrastructure.models.arrangement";
import type { BookInfo as DomainBookInfo } from "bibleVizUtils.domain.models.arrangement";
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

  toDomain(
    info: InfrastructureBookInfo,
    path: DomainBookInfo["path"]
  ): DomainBookInfo {
    const staticInfo = this.#booksStaticInfoRepository.getBookStaticInfo(
      info.commonName
    );
    return {
      commonName: info.commonName,
      customColor: info.customColor,
      customLabelColor: info.customLabelColor,
      isCheckpoint: info.isCheckpoint,
      group: info.group,
      ...staticInfo,
      path,
    };
  }

  toInfrastructure(info: DomainBookInfo): InfrastructureBookInfo {
    const { arrangementName, testamentIndex, sectionIndex, bookIndex } =
      info.path;

    const arrangementFinder = (arrangement: ArrangementInfo) => {
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
