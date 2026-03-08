import { LayoutBookStructure } from "bibleVizUtils.models.entities.LayoutBookStructure";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
import type { HexString } from "bibleVizUtils.models.common.types";
import { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";

interface StaticLayoutPieces {
  cover: Bot;
  settingsButtons: Bot[];
  settingsButton: Bot;
  sectionLines: Bot[];
  sectionLabels: Bot[];
  testamentLines: Bot[];
  testamentLabels: Bot[];
}

interface DataParams {
  childrenStructures?: LayoutBookStructure[];
  id: string;
  staticLayoutPieces: StaticLayoutPieces;
  isShowingSettings?: boolean;
  amountOfRows: number;
  sectionLinesInfo?: any; // TODO: Define this
  testamentLinesInfo?: any; // TODO: Define this
  currentDateFormat?: "HistoricalDate" | "ElapsedYears"; // TODO: Implement actual enum for DateFormats.json
  currentPlaylistShownId: string;
  playlistSelectedEntryIndex?: number;
  playlistEntries?: any[]; // TODO: Define this
}

export class LayoutBibleData {
  #id: string;
  #staticLayoutPieces: StaticLayoutPieces;
  #childrenStructures: LayoutBookStructure[];
  #isShowingSettings: boolean;
  #isCameraAnimationEnabled: boolean = false;
  #areLabelsEnabled: boolean = false;
  #isPlaylistPathEnabled: boolean = false;
  #isPathEnabled: boolean = false;
  // #isDatesEnabled TODO: Investigate this
  #isChapterExpandEnabled: boolean = false;
  #currentDateFormat: "HistoricalDate" | "ElapsedYears"; // TODO: Implement actual enum for DateFormats.json
  #chapterSelectColor: HexString = "#02B7BE";
  #hasSelectAllBooksBeenCalled: boolean = false;
  #currentSelectedChapterData: undefined | LayoutChapterData;
  #amountOfRows: number;
  #sectionLinesInfo: any;
  #testamentLinesInfo: any;
  #currentPlaylistShownId: string;
  #playlistSelectedEntryIndex: number;
  #playlistEntries: any[];
  #playlistLastSelectedEntryItem: undefined | any; // TODO: Implement/Define this

  constructor({
    childrenStructures = [],
    id,
    staticLayoutPieces,
    isShowingSettings = false,
    amountOfRows,
    sectionLinesInfo = null,
    testamentLinesInfo = null,
    currentDateFormat = BibleVizUtils.Data.tags.DateFormats.HistoricalDate,
    currentPlaylistShownId,
    playlistSelectedEntryIndex = 0,
    playlistEntries = [],
  }: DataParams) {
    // this.isDatesEnabled = 2;
    this.#id = id;
    this.#staticLayoutPieces = staticLayoutPieces;
    this.#childrenStructures = childrenStructures;
    this.#isShowingSettings = isShowingSettings;
    this.#currentDateFormat = currentDateFormat;
    this.#amountOfRows = amountOfRows;
    this.#sectionLinesInfo = sectionLinesInfo;
    this.#testamentLinesInfo = testamentLinesInfo;
    this.#currentPlaylistShownId = currentPlaylistShownId;
    this.#playlistSelectedEntryIndex = playlistSelectedEntryIndex;
    this.#playlistEntries = playlistEntries;
  }

  AddChild(newChild: LayoutBookStructure) {
    this.#childrenStructures.push(newChild);
  }
}
