import {
  GetExplodedViewBooksPositions,
  GetChildrenLevelColors,
  HexToRgb,
} from "bibleVizUtils.functions.index";
import type {
  ArrangementInfo,
  BookInfo,
  BookStaticInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";
import type { StackPieceMeasurementsType } from "bibleVizUtils.data.StackPieceMeasurements";
import type { StackSpacingsType } from "bibleVizUtils.data.StackSpacings";
import type { ArrangementTemplate } from "bibleVizUtils.models.arrangement.models";

type TemplateToArrangement = (params: {
  template: ArrangementTemplate;
  getSectionChapterCount: (books: BookInfo[]) => number;
  getStackPieceMeasurement: <K extends keyof StackPieceMeasurementsType>(
    measurement: K
  ) => StackPieceMeasurementsType[K];
  getBookStaticInfo: (book: string) => BookStaticInfo | undefined;
  getStackSpacing: <K extends keyof StackSpacingsType>(
    spacing: K
  ) => StackSpacingsType[K];
}) => ArrangementInfo;
type ArrangementToTemplate = (
  arrangement: ArrangementInfo,
  generateId: () => string
) => ArrangementTemplate;

export class ArrangementMapper {
  static toArrangement: TemplateToArrangement = ({
    template,
    getSectionChapterCount,
    getStackPieceMeasurement,
    getBookStaticInfo,
    getStackSpacing,
  }) => {
    const { name: templateName, testaments } = template;
    const arrangement: ArrangementInfo = {
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
            const amountOfChaptersInSection = getSectionChapterCount(
              books.map((book) => {
                return { commonName: book.name };
              })
            );
            const sectionDesiredScaleZ =
              amountOfChaptersInSection *
              getStackPieceMeasurement("SectionDesiredScaleZRatio");
            const sectionAvailableSpace =
              sectionDesiredScaleZ -
              getStackSpacing("BetweenBooks") * (books.length + 1);
            const sectionExplodedViewScaleZ = sectionDesiredScaleZ * 2;

            const booksScalesZ = books.map((book) => {
              const { name: bookName } = book;
              const chaptersCount =
                getBookStaticInfo(bookName)?.numberOfChapters ?? 0;
              const percentageOfBookInSection =
                chaptersCount / amountOfChaptersInSection;
              const bookScaleZ =
                percentageOfBookInSection * sectionAvailableSpace;
              return bookScaleZ;
            });
            const positions = GetExplodedViewBooksPositions({
              booksScalesZ,
              sectionExplodedViewScaleZ,
            });

            return {
              name: section.name,
              color: section.color,
              books: books.map((book, index) => {
                const positionZ = positions[index];
                return {
                  commonName: book.name,
                  customColor: book.color,
                  explodedViewPosition: { x: 0, y: 0, z: positionZ ?? 0 },
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
              customColorRange,
            }) => {
              const bookLevelColors = GetChildrenLevelColors({
                sectionColorRGB: HexToRgb({
                  hexColor: sectionColor,
                }),
                colorRange: customColorRange ?? 70,
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
