const {data} = that;

if(data.isSelected)
{
    const isSectionBookDataInstance = data instanceof StackSectionBookData || data.constructor.name === "StackSectionBookData";
    const chapterColumns = Math.floor((isSectionBookDataInstance ? data.piece.tags.initialScaleX : data.piece.tags.singleBooksScales.x) / (BibleVizUtils.Data .ChapterWidth + (StackSpacing.ChapterGap*2)))
    const chapterRows = Math.ceil(data.piece.tags.numberOfChapters / chapterColumns) + 1;
    const selectedBookHeight = chapterRows * (StackPieceMeasurements.ChapterHeight + (StackSpacing.ChapterGap*2));
    return {chapterColumns, chapterRows, selectedBookHeight};
}
else
{
    return {};
}