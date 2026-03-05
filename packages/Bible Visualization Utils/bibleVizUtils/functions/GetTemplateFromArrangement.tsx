const { arrangementInfo } = that;

const template = {
  name: arrangementInfo.name,
  id: uuid(),
  testaments: arrangementInfo.testaments.map((testamentInfo: any) => {
    return {
      name: testamentInfo.name,
      id: uuid(),
      color: "#FFFFFF",
      sections: testamentInfo.sections.map((sectionInfo: any) => {
        const bookLevelColors = thisBot.GetChildrenLevelColors({
          sectionColorRGB: thisBot.HexToRgb({ hexColor: sectionInfo.color }),
          colorRange: sectionInfo.customColorRange ?? 70,
          levelsLength: sectionInfo.books.slice().length,
        });
        return {
          name: sectionInfo.name,
          id: uuid(),
          color: sectionInfo.color,
          books: sectionInfo.books.map((bookInfo: any, index) => {
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
