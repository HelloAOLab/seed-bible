/**
    * This tag is called when this bot is created
    * Here is made all the initial setup of the Stack manager
    * @example
    * thisBot.Initialize();
*/

if(thisBot.masks.initialized || typeof InteractiveBibleData !== "undefined") return;

setTagMask(thisBot, "initialized", true);
globalThis.InteractiveBibleData = thisBot;

thisBot.vars.customArrangements = [];
thisBot.vars.fixedArrangementsInfo = [];

thisBot.UpdateFixedArrangementsInfo();

const BibleLayoutMeasurements = {
    MaxAmountOfColumns: 7,
    Book3DMaxAmountOfColumns: 5,
    Chapter3DWidth: 0.5,
    Chapter3DHeight: 0.5,
    Chapter3DPadding: 0.1,
    Chapter3DGap: 0.1,
    BookHorizontalGap: 1,
    BookVerticalGap: 1,
    LayersVerticalGap: [3.5, 13.5, 21.625, 30.5, 43.5, 53.5, 57.5, 61.5, 68.5, 74],
    GapBetweenBookAndLine: 1.5,
    BookHorizontalOffset: 5,
    BookLabelHeight: 1,
    BookPositionZ: 1,
    ChapterInitialScaleZ: 0.15,
    ChapterSelectedScaleZ: 0.3,
    ChapterPlaylistItemDeltaHeight: 0.075,
    PlaylistNavigationButtonVerticalGap: 1,
    PlaylistStackedEntryItemGap: 0.0375,
    PlaylistEntryItemPadding: 0.01,

    Chapter2DGap: 0.1,
    Chapter2DHeight: 0.5,
    Chapter2DWidth: 0.5,
    Chapter2DPadding: 0.1,
    Book2DMaxAmountOfColumns: 5
}
const BookScaleX = (BibleLayoutMeasurements.BookMaxAmountOfColumns * BibleLayoutMeasurements.ChapterWidth) + (BibleLayoutMeasurements.ChapterPadding * 2) + (BibleLayoutMeasurements.ChapterGap * (BibleLayoutMeasurements.BookMaxAmountOfColumns - 1))

BibleLayoutMeasurements.Book3DScaleX = BookScaleX;
BibleLayoutMeasurements.Book2DScaleX = BookScaleX;

setTag(thisBot, "BibleLayoutMeasurements", BibleLayoutMeasurements);