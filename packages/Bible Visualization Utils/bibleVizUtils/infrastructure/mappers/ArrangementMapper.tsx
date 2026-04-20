import {
  GetChildrenLevelColors,
  HexToRgb,
} from "bibleVizUtils.domain.functions.colors";
// import { GetExplodedViewBooksPositions } from "bibleVizUtils.infrastructure.functions.layout";
import type {
  ArrangementInfo as DomainArrangementInfo,
  BookInfo,
  // BookStaticInfo,
  ArrangementTemplate,
} from "bibleVizUtils.domain.models.arrangement";
// import type { StackPieceMeasurementsType } from "bibleVizUtils.infrastructure.data.StackPieceMeasurements";
// import type { StackSpacingsType } from "bibleVizUtils.infrastructure.data.StackSpacings";
import { BibleVizDataRepository } from "bibleVizUtils.infrastructure.data.BibleVizDataRepository";

type TemplateToArrangement = (params: {
  template: ArrangementTemplate;
  // getSectionChapterCount: (books: { commonName: string }[]) => number;
  // getStackPieceMeasurement: <K extends keyof StackPieceMeasurementsType>(
  //   measurement: K
  // ) => StackPieceMeasurementsType[K];
  // getBookStaticInfo: (book: string) => BookStaticInfo | undefined;
  // getStackSpacing: <K extends keyof StackSpacingsType>(
  //   spacing: K
  // ) => StackSpacingsType[K];
}) => DomainArrangementInfo;

type ArrangementToTemplate = (
  arrangement: DomainArrangementInfo,
  generateId: () => string
) => ArrangementTemplate;

export class ArrangementMapper {
  static toArrangement: TemplateToArrangement = ({
    template,
    // getSectionChapterCount,
    // getStackPieceMeasurement,
    // getBookStaticInfo,
    // getStackSpacing,
  }) => {
    const { name: templateName, testaments } = template;
    const arrangement: DomainArrangementInfo = {
      name: templateName,
      testaments: testaments.map((testament) => {
        const {
          name: testamentName,
          color: testamentColor,
          sections,
        } = testament;
        return {
          name: testamentName,
          color: testamentColor,
          sections: sections.map((section) => {
            const { books } = section;
            // const amountOfChaptersInSection = getSectionChapterCount(
            //   books.map((book) => {
            //     return { commonName: book.name };
            //   })
            // );
            // const sectionDesiredScaleZ =
            //   amountOfChaptersInSection *
            //   getStackPieceMeasurement("SectionDesiredScaleZRatio");
            // const sectionAvailableSpace =
            //   sectionDesiredScaleZ -
            //   getStackSpacing("BetweenBooks") * (books.length + 1);
            // const sectionExplodedViewScaleZ = sectionDesiredScaleZ * 2;

            // const booksScalesZ = books.map((book) => {
            //   const { name: bookName } = book;
            //   const chaptersCount =
            //     getBookStaticInfo(bookName)?.numberOfChapters ?? 0;
            //   const percentageOfBookInSection =
            //     chaptersCount / amountOfChaptersInSection;
            //   const bookScaleZ =
            //     percentageOfBookInSection * sectionAvailableSpace;
            //   return bookScaleZ;
            // });
            // const positions = GetExplodedViewBooksPositions({
            //   booksScalesZ,
            //   sectionExplodedViewScaleZ,
            // });

            return {
              name: section.name,
              color: section.color,
              books: books.map((book /*, index*/): BookInfo => {
                // const positionZ = positions[index];
                const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(
                  book.name
                );
                if (!bookStaticInfo) {
                  throw new Error(
                    `ArrangementMapper: bookStaticInfo not found at toArrangement`
                  );
                }
                return {
                  commonName: book.name,
                  customColor: book.color,
                  // explodedViewPosition: { x: 0, y: 0, z: positionZ ?? 0 },
                  ...bookStaticInfo,
                };
              }),
            };
          }),
        };
      }),
    };

    return arrangement;
  };

  static toTemplate: ArrangementToTemplate = (arrangement, generateId) => {
    const { name, testaments } = arrangement;
    const template: ArrangementTemplate = {
      name,
      id: generateId(),
      testaments: testaments.map(({ name: testamentName, sections }) => {
        return {
          name: testamentName,
          color: "#FFFFFF",
          id: generateId(),
          sections: sections.map(
            ({
              name: sectionName,
              color: sectionColor,
              books,
              // customColorRange,
            }) => {
              const bookLevelColors = GetChildrenLevelColors({
                sectionColorRGB: HexToRgb({
                  hexColor: sectionColor,
                }),
                colorRange: /*customColorRange ??*/ 70,
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

    return template;
  };
}
