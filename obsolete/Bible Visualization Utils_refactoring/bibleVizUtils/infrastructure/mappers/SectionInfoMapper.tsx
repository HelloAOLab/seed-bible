import type {
  SectionInfoConfig as InfrastructureSectionInfo,
  ArrangementInfoConfig,
} from "bibleVizUtils.infrastructure.models.arrangement";
import type { SectionInfo as DomainSectionInfo } from "bibleVizUtils.domain.models.arrangement";
import type {
  ArrangementConfigProviderPort,
  CustomArrangementStorePort,
} from "bibleVizUtils.infrastructure.ports.bookInfo";
import { BookInfoMapper } from "./BookInfoMapper";

interface MapperParams {
  bookInfoMapper: BookInfoMapper;
  arrangementConfigProviderPort: ArrangementConfigProviderPort;
  customArrangementStorePort: CustomArrangementStorePort;
}

export class SectionInfoMapper {
  #bookInfoMapper: MapperParams["bookInfoMapper"];
  #arrangementConfigProviderPort: MapperParams["arrangementConfigProviderPort"];
  #customArrangementStorePort: MapperParams["customArrangementStorePort"];

  constructor({
    bookInfoMapper,
    arrangementConfigProviderPort,
    customArrangementStorePort,
  }: MapperParams) {
    this.#bookInfoMapper = bookInfoMapper;
    this.#arrangementConfigProviderPort = arrangementConfigProviderPort;
    this.#customArrangementStorePort = customArrangementStorePort;
  }

  toDomain(
    info: InfrastructureSectionInfo,
    path: DomainSectionInfo["path"]
  ): DomainSectionInfo {
    return {
      name: info.name,
      color: info.color,
      path,
      translationKey: info.translationKey,
      books: info.books.map((book, bookIndex) =>
        this.#bookInfoMapper.toDomain(book, { ...path, bookIndex })
      ),
    };
  }

  toInfrastructure(info: DomainSectionInfo): InfrastructureSectionInfo {
    const { arrangementName, testamentIndex, sectionIndex } = info.path;

    const arrangementFinder = (arrangement: ArrangementInfoConfig) =>
      arrangement.name === arrangementName;

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
        `SectionInfoMapper: foundArrangement not found at toInfrastructure`
      );
    }

    const infrastructureInfo =
      foundArrangement.testaments[testamentIndex]?.sections[sectionIndex];

    if (!infrastructureInfo) {
      throw new Error(
        `SectionInfoMapper: infrastructureInfo not found at toInfrastructure`
      );
    }

    return infrastructureInfo;
  }
}
