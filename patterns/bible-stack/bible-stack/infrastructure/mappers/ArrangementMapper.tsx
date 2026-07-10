import {
  GetChildrenLevelColors,
  HexToRgb,
} from "../../domain/functions/colors";
import type {
  ArrangementInfo,
  BookInfo,
  ArrangementTemplate,
} from "../../domain/models/arrangement";
import type { BooksStaticInfoRepository } from "../adapters/arrangement/BooksStaticInfoRepository";
import type { ArrangementInfoConfig } from "../models/arrangement";
import type { SectionInfoMapper } from "./SectionInfoMapper";

interface MapperParams {
  booksStaticInfoRepository: BooksStaticInfoRepository;
  sectionInfoMapperPort: SectionInfoMapper;
}

export class ArrangementMapper {
  #booksStaticInfoRepository: MapperParams["booksStaticInfoRepository"];
  #sectionInfoMapperPort: MapperParams["sectionInfoMapperPort"];

  setSectionInfoMapperPort(port: SectionInfoMapper) {
    this.#sectionInfoMapperPort = port;
  }

  constructor({
    booksStaticInfoRepository,
    sectionInfoMapperPort,
  }: MapperParams) {
    this.#booksStaticInfoRepository = booksStaticInfoRepository;
    this.#sectionInfoMapperPort = sectionInfoMapperPort;
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
                if (!bookStaticInfo) {
                  throw new Error(
                    `ArrangementMapper: bookStaticInfo not found`
                  );
                }
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

  toDomain(infrastructureArrangement: ArrangementInfoConfig): ArrangementInfo {
    return {
      ...infrastructureArrangement,
      testaments: infrastructureArrangement.testaments.map(
        (testament, testamentIndex) => {
          return {
            ...testament,
            sections: testament.sections.map((section, sectionIndex) => {
              return (
                this.#sectionInfoMapperPort as SectionInfoMapper
              ).toDomain(section, {
                arrangementName: infrastructureArrangement.name,
                testamentIndex,
                sectionIndex,
              });
            }),
          };
        }
      ),
    };
  }
}
