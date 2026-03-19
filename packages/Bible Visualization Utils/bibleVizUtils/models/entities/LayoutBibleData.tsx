import type {
  LayoutBookStructure,
  DateFormat,
} from "bibleVizUtils.models.canvas";
import { DateFormats } from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
import type { HexString } from "bibleVizUtils.models.commonTypes";
import type { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";
import type {
  TestamentInfo,
  SectionInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";

interface StaticLayoutPieces {
  cover: Bot;
  settingsButtons: Bot[];
  settingsButton: Bot;
  sectionLines: Bot[];
  sectionLabels: Bot[];
  testamentLines: Bot[];
  testamentLabels: Bot[];
}

type GridPosition = {
  row: number;
  column: number;
};

interface TestamentLineInfo {
  name: TestamentInfo["name"];
  startRow: number;
  endRow: undefined | number;
  color: HexString;
  arrangementIndex: number;
  testamentIndex: number;
}

interface SectionLineInfo {
  testamentName: TestamentInfo["name"];
  name: SectionInfo["name"];
  segments: {
    start: GridPosition;
    end: GridPosition;
  }[];
  color: SectionInfo["color"];
  arrangementIndex: number;
  testamentIndex: number;
  sectionIndex: number;
}

interface DataParams {
  childrenStructures?: LayoutBookStructure[];
  id: string;
  staticLayoutPieces: StaticLayoutPieces;
  isShowingSettings?: boolean;
  amountOfRows: number;
  sectionLinesInfo?: SectionLineInfo[];
  testamentLinesInfo?: TestamentLineInfo[];
  currentDateFormat?: DateFormat;
  currentPlaylistShownId?: string;
  playlistSelectedEntryIndex?: number;
  playlistEntries?: Bot[];
}

export class LayoutBibleData {
  #id: string;
  #staticLayoutPieces: DataParams["staticLayoutPieces"] | undefined;
  #childrenStructures: NonNullable<DataParams["childrenStructures"]>;
  #isShowingSettings: NonNullable<DataParams["isShowingSettings"]>;
  #isCameraAnimationEnabled: boolean = false;
  #areLabelsEnabled: boolean = false;
  #isPlaylistPathEnabled: boolean = false;
  #isPathEnabled: boolean = false;
  #isDatesEnabled: number; // TODO: Improve this
  #isChapterExpandEnabled: boolean = false;
  #currentDateFormat: NonNullable<DataParams["currentDateFormat"]>;
  #chapterSelectColor: HexString = "#02B7BE";
  #hasSelectAllBooksBeenCalled: boolean = false;
  #currentSelectedChapterData: undefined | LayoutChapterData;
  #amountOfRows: DataParams["amountOfRows"];
  #sectionLinesInfo: DataParams["sectionLinesInfo"];
  #testamentLinesInfo: DataParams["testamentLinesInfo"];
  #currentPlaylistShownId: DataParams["currentPlaylistShownId"];
  #playlistSelectedEntryIndex: NonNullable<
    DataParams["playlistSelectedEntryIndex"]
  >;
  #playlistEntries: DataParams["playlistEntries"];
  #playlistLastSelectedEntryItem:
    | undefined
    | NonNullable<DataParams["playlistEntries"]>[number];

  constructor({
    childrenStructures = [],
    id,
    staticLayoutPieces,
    isShowingSettings = false,
    amountOfRows,
    sectionLinesInfo = undefined,
    testamentLinesInfo = undefined,
    currentDateFormat = DateFormats.HistoricalDate,
    currentPlaylistShownId,
    playlistSelectedEntryIndex = 0,
    playlistEntries = [],
  }: DataParams) {
    this.#isDatesEnabled = 2;
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

  get childrenStructures() {
    return [...this.#childrenStructures];
  }
  getStructureByBookData(
    layoutBookData: LayoutBookStructure["layoutBookData"]
  ): LayoutBookStructure | undefined {
    return this.childrenStructures.find((structure) => {
      return structure.layoutBookData.id === layoutBookData.id;
    });
  }
  setBookData(layoutBookData: LayoutBookStructure["layoutBookData"]): boolean {
    const structure = this.getStructureByBookData(layoutBookData);

    if (!structure) return false;

    structure.layoutBookData = layoutBookData;

    return true;
  }
  replaceBookData(
    currBookData: LayoutBookStructure["layoutBookData"],
    newBookData: LayoutBookStructure["layoutBookData"]
  ): boolean {
    const structure = this.getStructureByBookData(currBookData);

    if (!structure) return false;

    structure.layoutBookData = newBookData;

    return true;
  }
  addChild(newChild: NonNullable<DataParams["childrenStructures"]>[number]) {
    this.#childrenStructures.push(newChild);
  }
  clearChildren(): LayoutBookStructure[] {
    const clearedChildren = this.childrenStructures;
    this.#childrenStructures = [];
    return clearedChildren;
  }
  get id() {
    return this.#id;
  }
  get staticLayoutPieces() {
    return { ...this.#staticLayoutPieces };
  }
  clearStaticPieces():
    | StaticLayoutPieces[keyof StaticLayoutPieces][]
    | undefined {
    if (this.staticLayoutPieces) {
      const releasedPieces = Object.values(this.staticLayoutPieces);
      this.#staticLayoutPieces = undefined;
      return releasedPieces;
    }
    return undefined;
  }
  get isShowingSettings() {
    return this.#isShowingSettings;
  }
  showSettings() {
    this.#isShowingSettings = true;
  }
  hideSettings() {
    this.#isShowingSettings = false;
  }
  get isCameraAnimationEnabled() {
    return this.#isCameraAnimationEnabled;
  }
  enableCameraAnimation() {
    this.#isCameraAnimationEnabled = true;
  }
  disableCameraAnimation() {
    this.#isCameraAnimationEnabled = false;
  }
  get areLabelsEnabled() {
    return this.#areLabelsEnabled;
  }
  enableLabels() {
    this.#areLabelsEnabled = true;
  }
  disableLabels() {
    this.#areLabelsEnabled = false;
  }
  get isPlaylistPathEnabled() {
    return this.#isPlaylistPathEnabled;
  }
  enablePlaylistPath() {
    this.#isPlaylistPathEnabled = true;
  }
  disablePlaylistPath() {
    this.#isPlaylistPathEnabled = false;
  }
  get isPathEnabled() {
    return this.#isPathEnabled;
  }
  enablePath() {
    this.#isPathEnabled = true;
  }
  disablePath() {
    this.#isPathEnabled = false;
  }
  get isChapterExpandEnabled() {
    return this.#isChapterExpandEnabled;
  }
  enableChapterExpand() {
    this.#isChapterExpandEnabled = true;
  }
  disableChapterExpand() {
    this.#isChapterExpandEnabled = false;
  }
  get currentDateFormat() {
    return this.#currentDateFormat;
  }
  changeDateFormat(newFormat: NonNullable<DataParams["currentDateFormat"]>) {
    this.#currentDateFormat = newFormat;
  }
  get chapterSelectColor() {
    return this.#chapterSelectColor;
  }
  changeSelectColor(newColor: HexString) {
    this.#chapterSelectColor = newColor;
  }
  get hasSelectAllBooksBeenCalled() {
    return this.#hasSelectAllBooksBeenCalled;
  }
  handleAllBooksSelected() {
    this.#hasSelectAllBooksBeenCalled = true;
  }
  get currentSelectedChapterData(): LayoutChapterData | undefined {
    return this.#currentSelectedChapterData;
  }
  selectChapterData(data: LayoutChapterData) {
    this.#currentSelectedChapterData = data;
  }
  clearSelectedChapterData() {
    this.#currentSelectedChapterData = undefined;
  }
  get amountOfRows() {
    return this.#amountOfRows;
  }
  get sectionLinesInfo() {
    return this.#sectionLinesInfo;
  }
  get testamentLinesInfo() {
    return this.#testamentLinesInfo;
  }
  get currentPlaylistShownId() {
    return this.#currentPlaylistShownId;
  }
  changePlaylistShownId(newId: DataParams["currentPlaylistShownId"]) {
    this.#currentPlaylistShownId = newId;
  }
  get playlistSelectedEntryIndex() {
    return this.#playlistSelectedEntryIndex;
  }
  changePlaylistSelectedEntryIndex(newIndex: number) {
    this.#playlistSelectedEntryIndex = newIndex;
  }
  get playlistEntries() {
    if (this.#playlistEntries) {
      return [...this.#playlistEntries];
    }
    return undefined;
  }
  get playlistLastSelectedEntryItem() {
    return this.#playlistLastSelectedEntryItem;
  }
  changePlaylistLastSelectedItem(
    item: NonNullable<DataParams["playlistEntries"]>[number]
  ) {
    this.#playlistLastSelectedEntryItem = item;
  }
  get isDatesEnabled() {
    return this.#isDatesEnabled;
  }
  changeDatesEnabled(value: number) {
    this.#isDatesEnabled = value;
  }
}
