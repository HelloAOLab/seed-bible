import {SectionBookData} from "bibleVizUtils.classes.SectionBookData"

const {data} that;

if(data.isSelected)
{
    const isSectionBookDataInstance = data instanceof SectionBookData || data.constructor.name === "SectionBookData";
    const chapterColumns = Math.floor((isSectionBookDataInstance ? data.element.tags.initialScaleX : data.element.tags.singleBooksScales.x) / (BibleVizUtils.Data .ChapterWidth + (StackSpacing.ChapterGap*2)))
    const chapterRows = Math.ceil(data.element.tags.numberOfChapters / chapterColumns) + 1;
    const selectedBookHeight = chapterRows * (StackElementMeasurements.ChapterHeight + (StackSpacing.ChapterGap*2));
    return {chapterColumns, chapterRows, selectedBookHeight};
}
else
{
    return {};
}