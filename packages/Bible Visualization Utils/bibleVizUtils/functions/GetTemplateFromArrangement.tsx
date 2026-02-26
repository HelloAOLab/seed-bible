import { GetChildrenLevelColors } from "bibleVizUtils.functions.index";

const { arrangementInfo } = that;

const template = {
  name: arrangementInfo.name,
  id: uuid(),
  testaments: arrangementInfo.testaments.map((testamentInfo) => {
    return {
      name: testamentInfo.name,
      id: uuid(),
      color: "#FFFFFF",
      sections: testamentInfo.sections.map((sectionInfo) => {
        const bookLevelColors = GetChildrenLevelColors({
          sectionColorRGB: thisBot.HexToRgb({ hexColor: sectionInfo.color }),
          colorRange: sectionInfo.customColorRange ?? 70,
          levelsLength: sectionInfo.books.slice().length,
        });
        return {
          name: sectionInfo.name,
          id: uuid(),
          color: sectionInfo.color,
          books: sectionInfo.books.map((bookInfo, index) => {
            return {
              name: bookInfo.commonName,
              color: bookLevelColors[index],
              id: uuid(),
            };
          }),
        };
      }),
    };
  }),
};
return template;
