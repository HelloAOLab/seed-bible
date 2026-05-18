import {
  GetChildrenLevelColors,
  HexToRgb,
} from "bibleVizUtils.domain.functions.colors";
import type {
  ArrangementInfo,
  BookInfo,
  ArrangementTemplate,
} from "bibleVizUtils.domain.models.arrangement";
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
  }): ArrangementInfo {
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
                  this.#booksStaticInfoRepository.getBookStaticInfo(book.name);
                return {
                  bookId: book.name,
                  type: "complete",
                  author: bookStaticInfo.author,
                  chaptersVerseCount: bookStaticInfo.chaptersVerseCount,
                  relativeDateRange: bookStaticInfo.relativeDateRange,
                  numberOfChapters: bookStaticInfo.numberOfChapters,
                  customColor: book.color,
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
    arrangement: ArrangementInfo,
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
                books: books.map(({ bookId: bookName }, bookIndex) => {
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
