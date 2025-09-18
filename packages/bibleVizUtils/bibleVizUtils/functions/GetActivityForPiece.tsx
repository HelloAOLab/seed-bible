const {piece, tabsContext} = that;

const tabsPathMap = new Map(tabsContext.tabs.map((tab) => {
    const {book, chapter} = tab.data;
    
    const {arrangementIndex, testamentIndex, sectionIndex} = thisBot.GetBookInfoPathByName({name: book, arrangementIndex: 0});
    const testamentName = BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].name;
    const sectionName = BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].name
    const path = [
        new PieceInfo({typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackTestament, key: testamentName}),
        new PieceInfo({typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackSection, key: sectionName}),
        new PieceInfo({typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackBook, key: book}),
        new PieceInfo({typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackChapter, key: `${book} ${chapter}`})
    ]

    return [tab, path]
}));

let key;
let typeOfPiece;
switch(piece.tags.typeOfPiece)
{
    case BibleVizUtils.Data.tags.BiblePieceType.StackTestament: 
        key = piece.tags.testamentName; 
        typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.StackTestament;
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.StackSection: 
        key = piece.tags.sectionName; 
        typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.StackSection;
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.StackSectionBook:
    case BibleVizUtils.Data.tags.BiblePieceType.StackBook:
    case BibleVizUtils.Data.tags.BiblePieceType.LayoutBook:
        key = piece.tags.bookName; 
        typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.StackBook;
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.StackChapter:
    case BibleVizUtils.Data.tags.BiblePieceType.LayoutChapter:
        key = `${piece.tags.parentBookName} ${piece.tags.chapterNumber}`;
        typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.StackChapter;
    break;
    default: break;
}

const activity = tabsContext.tabs.filter((tab) => {
    const tabPath = tabsPathMap.get(tab);

    return tabPath.some((pieceInfo) => {
        return pieceInfo.typeOfPiece === typeOfPiece && pieceInfo.key === key
    })

})

return activity;