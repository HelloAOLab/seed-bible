const {arrangementIndex, arrangement} = that;
let column = 0;
let row = 0;
// const bookIndex = 0;
const testamentLinesInfo = [];
const sectionLinesInfo = [];
const booksInfo = [];
const layers = []
let layer;

const testaments = arrangement.testaments.toReversed()
for(const testamentIndex in testaments)
{
    layer = [];
    const testamentInfo = testaments[testamentIndex];
    const testamentLineInfo = {
        name: testamentInfo.name,
        startRow: row,
        endRow: null,
        color: testamentInfo.color ?? "#FFFFFF",
        arrangementIndex,
        testamentIndex
    }
    const sections = testamentInfo.sections.toReversed()
    for(const sectionIndex in sections)
    {
        const sectionInfo = sections[sectionIndex]
        const sectionLinePoints = []
        const sectionLineInfo = {
            testamentName: testamentInfo.name,
            name: sectionInfo.name,
            segments: [],
            color: sectionInfo.color,
            arrangementIndex,
            testamentIndex,
            sectionIndex
        }
        const books = sectionInfo.books.toReversed()
        for(const bookIndex in books)
        {
            sectionLinePoints.push({row, column});
            const bookInfo = {
                name: books[bookIndex].commonName,
                testamentName: testamentInfo.name,
                sectionName: sectionInfo.name,
                column, 
                row, 
                arrangementIndex, 
                testamentIndex, 
                sectionIndex,
                bookIndex,
                color: books[bookIndex].customColor ?? null
            };
            booksInfo.push(bookInfo);
            layer.push(bookInfo);

            column++
            if(column >= BibleVizUtils.Data.tags.BibleLayoutMeasurements.MaxAmountOfColumns)
            {
                column = 0;
                row++;
                layers.push(layer);
                layer = [];
            }
        }
        for(let segmentRow = sectionLinePoints[0].row ; segmentRow <= sectionLinePoints[sectionLinePoints.length - 1].row ; segmentRow++)
        {
            const pointsWithinSegment = sectionLinePoints.filter((point) => {return point.row === segmentRow});
            const sortedPoints = pointsWithinSegment.toSorted((pointA, pointB) => {
                return pointA.column - pointB.column
            })
            const segment = {
                start: sortedPoints[0], 
                end: sortedPoints[sortedPoints.length - 1]
            }
            sectionLineInfo.segments.push(segment);
        }
        sectionLinesInfo.push(sectionLineInfo);
    }
    testamentLineInfo.endRow = row;
    testamentLinesInfo.push(testamentLineInfo);

    if(column > 0)
    {
        column = 0;
        row++;
        layers.push(layer);
    }
}

return { testamentLinesInfo, sectionLinesInfo, booksInfo, layers }