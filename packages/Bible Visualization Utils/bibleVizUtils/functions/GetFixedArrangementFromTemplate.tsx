const { template } = that;

const fixedArrangement = {
  name: template.name,
  testaments: template.testaments.map((testament: any) => {
    return {
      name: testament.name,
      color: testament.color,
      sections: testament.sections.map((section: any) => {
        const amountOfChaptersInSection = thisBot.GetAmountOfChaptersInSection({
          section: section.books.map((book: any) => {
            return { commonName: book.name };
          }),
        });
        const sectionDesiredScaleZ =
          amountOfChaptersInSection *
          BibleVizUtils.Data.tags.StackPieceMeasurements
            .SectionDesiredScaleZRatio;
        const sectionAvailableSpace =
          sectionDesiredScaleZ -
          BibleVizUtils.Data.tags.StackSpacing.BetweenBooks *
            (section.books.length + 1);
        const sectionExplodedViewScaleZ = sectionDesiredScaleZ * 2;

        const booksScalesZ = section.books.map((book: any) => {
          const percentageOfBookInSection =
            BibleVizUtils.Data.tags.booksStaticInfo[book.name]
              .numberOfChapters / amountOfChaptersInSection;
          const bookScaleZ = percentageOfBookInSection * sectionAvailableSpace;
          return bookScaleZ;
        });
        const positions =
          thisBot.GetCustomArrangementExplodedViewBooksPositions({
            booksScalesZ,
            sectionExplodedViewScaleZ,
          });
        section.books.forEach((book: any, index: any) => {
          book.explodedViewPosition = { x: 0, y: 0, z: positions[index] };
        });

        return {
          name: section.name,
          color: section.color,
          books: section.books.map((book: any) => {
            return {
              commonName: book.name,
              customColor: book.color,
              explodedViewPosition: book.explodedViewPosition,
            };
          }),
        };
      }),
    };
  }),
};

return fixedArrangement;
