import type { ArrangementInfo as InfrastructureArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import type { ArrangementInfo as DomainArrangementInfo } from "bibleVizUtils.domain.models.arrangement";
import type { BooksStaticInfoRepository } from "bibleVizUtils.domain.ports.arrangement";

export class ArrangementAdapter {
  #booksStaticInfoRepository: BooksStaticInfoRepository;

  constructor(booksStaticInfoRepository: BooksStaticInfoRepository) {
    this.#booksStaticInfoRepository = booksStaticInfoRepository;
  }

  toDomain(
    infrastructureArrangement: InfrastructureArrangementInfo
  ): DomainArrangementInfo {
    return {
      ...infrastructureArrangement,
      testaments: infrastructureArrangement.testaments.map((testament) => {
        return {
          ...testament,
          sections: testament.sections.map((section) => {
            return {
              ...section,
              books: section.books.map((book) => {
                const staticInfo =
                  this.#booksStaticInfoRepository.getBookStaticInfo(
                    book.commonName
                  );
                return {
                  ...book,
                  ...staticInfo,
                };
              }),
            };
          }),
        };
      }),
    };
  }
}
