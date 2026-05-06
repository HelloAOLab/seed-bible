import {
  GetChildrenLevelColors,
  HexToRgb,
} from "bibleVizUtils.domain.functions.colors";
import type {
  ArrangementInfo as DomainArrangementInfo,
  BookInfo,
  ArrangementTemplate,
} from "bibleVizUtils.domain.models.arrangement";
import type { BookName } from "bibleVizUtils.domain.models.scripture";
import type { BooksStaticInfoRepository } from "bibleVizUtils.domain.ports.arrangement";

interface MapperParams {
  booksStaticInfoRepository: BooksStaticInfoRepository;
}

export class ArrangementMapper {
  #booksStaticInfoRepository: MapperParams["booksStaticInfoRepository"];

  constructor({ booksStaticInfoRepository }: MapperParams) {
    this.#booksStaticInfoRepository = booksStaticInfoRepository;
  }

  toArrangement({
    template,
  }: {
    template: ArrangementTemplate;
  }): DomainArrangementInfo {
    const { name: arrangementName, testaments } = template;
    return {
      name: arrangementName,
      testaments: testaments.map((testament, testamentIndex) => {
        return {
          name: testament.name,
          color: testament.color,
          sections: testament.sections.map((section, sectionIndex) => {
            return {
              name: section.name,
              color: section.color,
              path: { arrangementName, testamentIndex, sectionIndex },
              books: section.books.map((book, bookIndex): BookInfo => {
                const bookStaticInfo =
                  this.#booksStaticInfoRepository.getBookStaticInfo(
                    book.name as BookName
                  );
                return {
                  commonName: book.name as BookName,
                  customColor: book.color,
                  ...bookStaticInfo,
                  path: {
                    arrangementName,
                    testamentIndex,
                    sectionIndex,
                    bookIndex,
                  },
                };
              }),
            };
          }),
        };
      }),
    };
  }

  toTemplate(
    arrangement: DomainArrangementInfo,
    generateId: () => string
  ): ArrangementTemplate {
    const { name, testaments } = arrangement;
    return {
      name,
      id: generateId(),
      testaments: testaments.map(({ name: testamentName, sections }) => {
        return {
          name: testamentName,
          color: "#FFFFFF",
          id: generateId(),
          sections: sections.map(
            ({ name: sectionName, color: sectionColor, books }) => {
              const bookLevelColors = GetChildrenLevelColors({
                sectionColorRGB: HexToRgb({ hexColor: sectionColor }),
                colorRange: 70,
                levelsLength: books.length,
              });
              return {
                name: sectionName,
                color: sectionColor,
                id: generateId(),
                books: books.map(({ commonName: bookName }, bookIndex) => {
                  return {
                    name: bookName,
                    color: bookLevelColors[bookIndex] ?? "#FFFFFF",
                    id: generateId(),
                  };
                }),
              };
            }
          ),
        };
      }),
    };
  }
}
