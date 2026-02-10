export class LayoutBibleData {
  constructor({
    childrenStructures = [],
    id,
    staticLayoutElements = null,
    isShowingSettings = false,
    amountOfRows = null,
    sectionLinesInfo = null,
    testamentLinesInfo = null,
    currentDateFormat = BibleVizUtils.Data.tags.DateFormats.HistoricalDate,
    currentPlaylistShownId,
    playlistSelectedEntryIndex = 0,
    playlistEntries = [],
  }) {
    this.id = id;
    this.staticLayoutElements = staticLayoutElements;
    this.childrenStructures = childrenStructures;
    this.isShowingSettings = isShowingSettings;
    this.isCameraAnimationEnabled = false;
    this.areLabelsEnabled = false;
    this.isPlaylistPathEnabled = false;
    this.isPathEnabled = false;
    this.isDatesEnabled = 2;
    this.isChapterExpandEnabled = false;
    this.currentDateFormat = currentDateFormat;
    this.chapterSelectColor = "#02B7BE";
    this.hasSelectAllBooksBeenCalled = false;
    this.currentSelectedChapterData = null;
    this.amountOfRows = amountOfRows;
    this.sectionLinesInfo = sectionLinesInfo;
    this.testamentLinesInfo = testamentLinesInfo;
    this.currentPlaylistShownId = currentPlaylistShownId;
    this.playlistSelectedEntryIndex = playlistSelectedEntryIndex;
    this.playlistEntries = playlistEntries;
    this.playlistLastSelectedEntryItem = null;
  }

  AddChild(newChild) {
    this.childrenStructures.push(newChild);
  }
}
