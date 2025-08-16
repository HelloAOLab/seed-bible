const {template} = that;

const fixedArrangement = {
    name: template.name,
    testaments: template.testaments.map((testament) => {
        return {
            name: testament.name,
            color: testament.color,
            sections: testament.sections.map((section) => {
                const amountOfChaptersInSection = thisBot.GetAmountOfChaptersInSection({section: section.books.map((book) => {return {commonName: book.name}})})
                const sectionDesiredScaleZ = amountOfChaptersInSection * BibleVizUtils.Data.tags.StackElementMeasurements.SectionDesiredScaleZRatio;
                const sectionAvailableSpace = sectionDesiredScaleZ - (BibleVizUtils.Data.tags.StackSpacing.BetweenBooks * (section.books.length + 1));
                const sectionExplodedViewScaleZ = sectionDesiredScaleZ * 2;

                const booksScalesZ = section.books.map((book) => {
                    const percentageOfBookInSection = BibleVizUtils.Data.tags.booksStaticInfo[book.name].numberOfChapters / amountOfChaptersInSection;
                    const bookScaleZ = percentageOfBookInSection * sectionAvailableSpace;
                    return bookScaleZ
                })
                const positions = thisBot.GetCustomArrangementExplodedViewBooksPositions({booksScalesZ, sectionExplodedViewScaleZ})
                section.books.forEach((book, index) => {
                    book.explodedViewPosition = {x: 0, y: 0, z: positions[index]}
                })
                
                return {
                    name: section.name,
                    color: section.color,
                    books: section.books.map((book) => {
                        return {
                            commonName: book.name,
                            customColor: book.color,
                            explodedViewPosition: book.explodedViewPosition
                        }
                    })
                }

            })
        }
    })
}

return fixedArrangement