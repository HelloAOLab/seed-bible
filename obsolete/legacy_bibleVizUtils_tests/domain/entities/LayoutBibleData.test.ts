import { LayoutBibleData } from "bibleVizUtils.domain.entities.LayoutBibleData";
import { LayoutChapterData } from "bibleVizUtils.domain.entities.LayoutChapterData";
import { DateFormats } from "bibleVizUtils.domain.models.canvas";

// ─── factories ───────────────────────────────────────────────────────────────

const makeStaticLayoutPieces = (overrides: any = {}): any => ({
  cover: { id: "cover", type: "LayoutCover" },
  colorPickerContent: { id: "colorPicker", type: "LayoutColorPicker" },
  settingsButtons: [],
  settingsButton: { id: "settingsBtn", type: "LayoutSettingsButton" },
  sectionLines: [],
  sectionLabels: [],
  testamentLines: [],
  testamentLabels: [],
  ...overrides,
});

const makeBookData = (id = "book-1"): any => ({ id });

const makeStructure = (overrides: any = {}): any => ({
  layoutBookData: makeBookData(),
  nameLabel: { id: "nameLabel", type: "LayoutNameLabel" },
  structureIndex: 0,
  layoutId: "layout-1",
  dateLabel: { id: "dateLabel", type: "LayoutDateLabel" },
  column: 0,
  ...overrides,
});

const makeParentIds = (partial: any = {}) => ({
  stackBibleId: undefined,
  stackTestamentId: undefined,
  stackSectionId: undefined,
  stackBookId: undefined,
  stackSectionBookId: undefined,
  layoutId: undefined,
  layoutBookId: undefined,
  ...partial,
});

const makeChapter = (overrides: any = {}) =>
  new LayoutChapterData({
    id: "chapter-1",
    pieceInfo: { amountOfVerses: 31, number: 1 },
    parentDataIds: makeParentIds(),
    originalLayoutId: undefined,
    creationParams: { bookId: "gen" },
    ...overrides,
  });

const makeBible = (overrides: any = {}) =>
  new LayoutBibleData({
    id: "bible-1",
    staticLayoutPieces: makeStaticLayoutPieces(),
    amountOfRows: 10,
    ...overrides,
  });

// ─── tests ───────────────────────────────────────────────────────────────────

describe("LayoutBibleData", () => {
  // ─── constructor ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("stores the id", () => {
      expect(makeBible({ id: "bible-42" }).id).toBe("bible-42");
    });

    it("stores amountOfRows", () => {
      expect(makeBible({ amountOfRows: 25 }).amountOfRows).toBe(25);
    });

    it("defaults childrenStructures to an empty array", () => {
      expect(makeBible().childrenStructures).toEqual([]);
    });

    it("stores provided childrenStructures", () => {
      const structure = makeStructure();
      expect(
        makeBible({ childrenStructures: [structure] }).childrenStructures
      ).toEqual([structure]);
    });

    it("defaults isShowingSettings to false", () => {
      expect(makeBible().isShowingSettings).toBe(false);
    });

    it("stores isShowingSettings=true when provided", () => {
      expect(makeBible({ isShowingSettings: true }).isShowingSettings).toBe(
        true
      );
    });

    it("defaults isCameraAnimationEnabled to false", () => {
      expect(makeBible().isCameraAnimationEnabled).toBe(false);
    });

    it("defaults areLabelsEnabled to false", () => {
      expect(makeBible().areLabelsEnabled).toBe(false);
    });

    it("defaults isPlaylistPathEnabled to false", () => {
      expect(makeBible().isPlaylistPathEnabled).toBe(false);
    });

    it("defaults isPathEnabled to false", () => {
      expect(makeBible().isPathEnabled).toBe(false);
    });

    it("defaults isChapterExpandEnabled to false", () => {
      expect(makeBible().isChapterExpandEnabled).toBe(false);
    });

    it("defaults currentDateFormat to HistoricalDate", () => {
      expect(makeBible().currentDateFormat).toBe(DateFormats.HistoricalDate);
    });

    it("stores a provided currentDateFormat", () => {
      expect(
        makeBible({ currentDateFormat: DateFormats.ElapsedYears })
          .currentDateFormat
      ).toBe(DateFormats.ElapsedYears);
    });

    it("defaults chapterSelectColor to '#02B7BE'", () => {
      expect(makeBible().chapterSelectColor).toBe("#02B7BE");
    });

    it("defaults hasSelectAllBooksBeenCalled to false", () => {
      expect(makeBible().hasSelectAllBooksBeenCalled).toBe(false);
    });

    it("defaults currentSelectedChapterData to undefined", () => {
      expect(makeBible().currentSelectedChapterData).toBeUndefined();
    });

    it("defaults sectionLinesInfo to undefined", () => {
      expect(makeBible().sectionLinesInfo).toBeUndefined();
    });

    it("stores provided sectionLinesInfo", () => {
      const info = [{ name: "Pentateuch" } as any];
      expect(makeBible({ sectionLinesInfo: info }).sectionLinesInfo).toBe(info);
    });

    it("defaults testamentLinesInfo to undefined", () => {
      expect(makeBible().testamentLinesInfo).toBeUndefined();
    });

    it("stores provided testamentLinesInfo", () => {
      const info = [{ name: "Old Testament" } as any];
      expect(makeBible({ testamentLinesInfo: info }).testamentLinesInfo).toBe(
        info
      );
    });

    it("defaults currentPlaylistShownId to undefined", () => {
      expect(makeBible().currentPlaylistShownId).toBeUndefined();
    });

    it("defaults playlistSelectedEntryIndex to 0", () => {
      expect(makeBible().playlistSelectedEntryIndex).toBe(0);
    });

    it("stores a provided playlistSelectedEntryIndex", () => {
      expect(
        makeBible({ playlistSelectedEntryIndex: 5 }).playlistSelectedEntryIndex
      ).toBe(5);
    });

    it("defaults playlistEntries to an empty array", () => {
      expect(makeBible().playlistEntries).toEqual([]);
    });

    it("defaults playlistLastSelectedEntryItem to undefined", () => {
      expect(makeBible().playlistLastSelectedEntryItem).toBeUndefined();
    });

    it("defaults isYear to true", () => {
      expect(makeBible().isYear).toBe(true);
    });

    it("defaults isShowYear to false", () => {
      expect(makeBible().isShowYear).toBe(false);
    });

    it("defaults areDatesEnabled to false", () => {
      expect(makeBible().areDatesEnabled).toBe(false);
    });
  });

  // ─── childrenStructures / addChild / clearChildren ───────────────────────────

  describe("childrenStructures / addChild / clearChildren", () => {
    it("childrenStructures getter returns a shallow copy — mutations do not affect internal state", () => {
      const structure = makeStructure();
      const bible = makeBible({ childrenStructures: [structure] });
      const snapshot = bible.childrenStructures;
      snapshot.push(makeStructure());
      expect(bible.childrenStructures).toHaveLength(1);
    });

    it("addChild appends the structure to childrenStructures", () => {
      const bible = makeBible();
      const structure = makeStructure();
      bible.addChild(structure);
      expect(bible.childrenStructures).toEqual([structure]);
    });

    it("addChild accumulates multiple structures in insertion order", () => {
      const bible = makeBible();
      const s1 = makeStructure({ layoutBookData: makeBookData("book-1") });
      const s2 = makeStructure({ layoutBookData: makeBookData("book-2") });
      bible.addChild(s1);
      bible.addChild(s2);
      expect(bible.childrenStructures).toEqual([s1, s2]);
    });

    it("clearChildren returns all current structures", () => {
      const s1 = makeStructure({ layoutBookData: makeBookData("book-1") });
      const s2 = makeStructure({ layoutBookData: makeBookData("book-2") });
      const bible = makeBible({ childrenStructures: [s1, s2] });
      expect(bible.clearChildren()).toEqual([s1, s2]);
    });

    it("clearChildren resets childrenStructures to an empty array", () => {
      const bible = makeBible({ childrenStructures: [makeStructure()] });
      bible.clearChildren();
      expect(bible.childrenStructures).toEqual([]);
    });

    it("clearChildren on an empty bible returns an empty array", () => {
      expect(makeBible().clearChildren()).toEqual([]);
    });
  });

  // ─── getStructureByBookData ───────────────────────────────────────────────────

  describe("getStructureByBookData", () => {
    it("returns the matching structure", () => {
      const bookData = makeBookData("book-1");
      const structure = makeStructure({ layoutBookData: bookData });
      const bible = makeBible({ childrenStructures: [structure] });
      expect(bible.getStructureByBookData(bookData)).toBe(structure);
    });

    it("returns undefined when no structure matches", () => {
      const bible = makeBible({ childrenStructures: [makeStructure()] });
      expect(
        bible.getStructureByBookData(makeBookData("nonexistent"))
      ).toBeUndefined();
    });

    it("matches by layoutBookData.id, not by reference", () => {
      const structure = makeStructure({
        layoutBookData: makeBookData("book-1"),
      });
      const bible = makeBible({ childrenStructures: [structure] });
      const lookalike = makeBookData("book-1");
      expect(bible.getStructureByBookData(lookalike)).toBe(structure);
    });
  });

  // ─── setBookData ─────────────────────────────────────────────────────────────

  describe("setBookData", () => {
    it("returns true and updates layoutBookData in the structure when found", () => {
      const original = makeBookData("book-1");
      const updated = makeBookData("book-1");
      const structure = makeStructure({ layoutBookData: original });
      const bible = makeBible({ childrenStructures: [structure] });
      expect(bible.setBookData(updated)).toBe(true);
      expect(structure.layoutBookData).toBe(updated);
    });

    it("returns false when no structure matches the given bookData id", () => {
      const bible = makeBible({ childrenStructures: [makeStructure()] });
      expect(bible.setBookData(makeBookData("nonexistent"))).toBe(false);
    });
  });

  // ─── replaceBookData ──────────────────────────────────────────────────────────

  describe("replaceBookData", () => {
    it("returns true and replaces layoutBookData with newBookData when currBookData is found", () => {
      const curr = makeBookData("book-1");
      const next = makeBookData("book-99");
      const structure = makeStructure({ layoutBookData: curr });
      const bible = makeBible({ childrenStructures: [structure] });
      expect(bible.replaceBookData(curr, next)).toBe(true);
      expect(structure.layoutBookData).toBe(next);
    });

    it("returns false when currBookData is not found", () => {
      const bible = makeBible({ childrenStructures: [makeStructure()] });
      expect(
        bible.replaceBookData(makeBookData("nonexistent"), makeBookData("new"))
      ).toBe(false);
    });
  });

  // ─── staticLayoutPieces / clearStaticPieces ───────────────────────────────────

  describe("staticLayoutPieces / clearStaticPieces", () => {
    it("staticLayoutPieces getter returns a shallow copy — not the same reference", () => {
      const bible = makeBible();
      expect(bible.staticLayoutPieces).not.toBe(bible.staticLayoutPieces);
    });

    it("staticLayoutPieces getter contains the stored pieces", () => {
      const pieces = makeStaticLayoutPieces();
      const bible = makeBible({ staticLayoutPieces: pieces });
      expect(bible.staticLayoutPieces.cover).toBe(pieces.cover);
    });

    it("clearStaticPieces returns Object.values of the stored pieces", () => {
      const pieces = makeStaticLayoutPieces();
      const bible = makeBible({ staticLayoutPieces: pieces });
      const result = bible.clearStaticPieces();
      expect(result).toContain(pieces.cover);
      expect(result).toContain(pieces.settingsButton);
    });

    it("clearStaticPieces sets staticLayoutPieces to undefined internally", () => {
      const bible = makeBible();
      bible.clearStaticPieces();
      expect(bible.staticLayoutPieces.cover).toBeUndefined();
    });

    it("clearStaticPieces returns an empty array on a second call — spread of undefined produces a truthy object", () => {
      const bible = makeBible();
      bible.clearStaticPieces();
      expect(bible.clearStaticPieces()).toEqual([]);
    });
  });

  // ─── isShowingSettings ────────────────────────────────────────────────────────

  describe("isShowingSettings / showSettings / hideSettings", () => {
    it("showSettings sets isShowingSettings to true", () => {
      const bible = makeBible();
      bible.showSettings();
      expect(bible.isShowingSettings).toBe(true);
    });

    it("hideSettings sets isShowingSettings to false", () => {
      const bible = makeBible({ isShowingSettings: true });
      bible.hideSettings();
      expect(bible.isShowingSettings).toBe(false);
    });
  });

  // ─── isCameraAnimationEnabled ─────────────────────────────────────────────────

  describe("isCameraAnimationEnabled / enableCameraAnimation / disableCameraAnimation", () => {
    it("enableCameraAnimation sets isCameraAnimationEnabled to true", () => {
      const bible = makeBible();
      bible.enableCameraAnimation();
      expect(bible.isCameraAnimationEnabled).toBe(true);
    });

    it("disableCameraAnimation sets isCameraAnimationEnabled to false", () => {
      const bible = makeBible();
      bible.enableCameraAnimation();
      bible.disableCameraAnimation();
      expect(bible.isCameraAnimationEnabled).toBe(false);
    });
  });

  // ─── areLabelsEnabled ─────────────────────────────────────────────────────────

  describe("areLabelsEnabled / enableLabels / disableLabels", () => {
    it("enableLabels sets areLabelsEnabled to true", () => {
      const bible = makeBible();
      bible.enableLabels();
      expect(bible.areLabelsEnabled).toBe(true);
    });

    it("disableLabels sets areLabelsEnabled to false", () => {
      const bible = makeBible();
      bible.enableLabels();
      bible.disableLabels();
      expect(bible.areLabelsEnabled).toBe(false);
    });
  });

  // ─── isPlaylistPathEnabled ────────────────────────────────────────────────────

  describe("isPlaylistPathEnabled / enablePlaylistPath / disablePlaylistPath", () => {
    it("enablePlaylistPath sets isPlaylistPathEnabled to true", () => {
      const bible = makeBible();
      bible.enablePlaylistPath();
      expect(bible.isPlaylistPathEnabled).toBe(true);
    });

    it("disablePlaylistPath sets isPlaylistPathEnabled to false", () => {
      const bible = makeBible();
      bible.enablePlaylistPath();
      bible.disablePlaylistPath();
      expect(bible.isPlaylistPathEnabled).toBe(false);
    });
  });

  // ─── isPathEnabled ────────────────────────────────────────────────────────────

  describe("isPathEnabled / enablePath / disablePath", () => {
    it("enablePath sets isPathEnabled to true", () => {
      const bible = makeBible();
      bible.enablePath();
      expect(bible.isPathEnabled).toBe(true);
    });

    it("disablePath sets isPathEnabled to false", () => {
      const bible = makeBible();
      bible.enablePath();
      bible.disablePath();
      expect(bible.isPathEnabled).toBe(false);
    });
  });

  // ─── isChapterExpandEnabled ───────────────────────────────────────────────────

  describe("isChapterExpandEnabled / enableChapterExpand / disableChapterExpand", () => {
    it("enableChapterExpand sets isChapterExpandEnabled to true", () => {
      const bible = makeBible();
      bible.enableChapterExpand();
      expect(bible.isChapterExpandEnabled).toBe(true);
    });

    it("disableChapterExpand sets isChapterExpandEnabled to false", () => {
      const bible = makeBible();
      bible.enableChapterExpand();
      bible.disableChapterExpand();
      expect(bible.isChapterExpandEnabled).toBe(false);
    });
  });

  // ─── currentDateFormat ────────────────────────────────────────────────────────

  describe("currentDateFormat / changeDateFormat", () => {
    it("changeDateFormat updates currentDateFormat", () => {
      const bible = makeBible();
      bible.changeDateFormat(DateFormats.ElapsedYears);
      expect(bible.currentDateFormat).toBe(DateFormats.ElapsedYears);
    });

    it("changeDateFormat overwrites the previous format", () => {
      const bible = makeBible({ currentDateFormat: DateFormats.ElapsedYears });
      bible.changeDateFormat(DateFormats.HistoricalDate);
      expect(bible.currentDateFormat).toBe(DateFormats.HistoricalDate);
    });
  });

  // ─── chapterSelectColor ───────────────────────────────────────────────────────

  describe("chapterSelectColor / changeSelectColor", () => {
    it("changeSelectColor stores the new color", () => {
      const bible = makeBible();
      bible.changeSelectColor("#ff0000");
      expect(bible.chapterSelectColor).toBe("#ff0000");
    });

    it("changeSelectColor overwrites the previous color", () => {
      const bible = makeBible();
      bible.changeSelectColor("#ff0000");
      bible.changeSelectColor("#00ff00");
      expect(bible.chapterSelectColor).toBe("#00ff00");
    });
  });

  // ─── hasSelectAllBooksBeenCalled ──────────────────────────────────────────────

  describe("hasSelectAllBooksBeenCalled / handleAllBooksSelected / clearAllBooksSelected", () => {
    it("handleAllBooksSelected sets hasSelectAllBooksBeenCalled to true", () => {
      const bible = makeBible();
      bible.handleAllBooksSelected();
      expect(bible.hasSelectAllBooksBeenCalled).toBe(true);
    });

    it("clearAllBooksSelected resets hasSelectAllBooksBeenCalled to false", () => {
      const bible = makeBible();
      bible.handleAllBooksSelected();
      bible.clearAllBooksSelected();
      expect(bible.hasSelectAllBooksBeenCalled).toBe(false);
    });
  });

  // ─── currentSelectedChapterData ───────────────────────────────────────────────

  describe("currentSelectedChapterData / selectChapterData / clearSelectedChapterData", () => {
    it("selectChapterData stores the chapter", () => {
      const bible = makeBible();
      const chapter = makeChapter();
      bible.selectChapterData(chapter);
      expect(bible.currentSelectedChapterData).toBe(chapter);
    });

    it("selectChapterData overwrites a previous value", () => {
      const bible = makeBible();
      const ch1 = makeChapter({ id: "ch-1" });
      const ch2 = makeChapter({ id: "ch-2" });
      bible.selectChapterData(ch1);
      bible.selectChapterData(ch2);
      expect(bible.currentSelectedChapterData).toBe(ch2);
    });

    it("clearSelectedChapterData resets to undefined", () => {
      const bible = makeBible();
      bible.selectChapterData(makeChapter());
      bible.clearSelectedChapterData();
      expect(bible.currentSelectedChapterData).toBeUndefined();
    });
  });

  // ─── currentPlaylistShownId ───────────────────────────────────────────────────

  describe("currentPlaylistShownId / changePlaylistShownId", () => {
    it("changePlaylistShownId stores the new id", () => {
      const bible = makeBible();
      bible.changePlaylistShownId("playlist-42");
      expect(bible.currentPlaylistShownId).toBe("playlist-42");
    });

    it("changePlaylistShownId can be set to undefined", () => {
      const bible = makeBible({ currentPlaylistShownId: "playlist-1" });
      bible.changePlaylistShownId(undefined);
      expect(bible.currentPlaylistShownId).toBeUndefined();
    });
  });

  // ─── playlistSelectedEntryIndex ───────────────────────────────────────────────

  describe("playlistSelectedEntryIndex / changePlaylistSelectedEntryIndex", () => {
    it("changePlaylistSelectedEntryIndex stores the new index", () => {
      const bible = makeBible();
      bible.changePlaylistSelectedEntryIndex(7);
      expect(bible.playlistSelectedEntryIndex).toBe(7);
    });

    it("changePlaylistSelectedEntryIndex overwrites the previous index", () => {
      const bible = makeBible({ playlistSelectedEntryIndex: 3 });
      bible.changePlaylistSelectedEntryIndex(9);
      expect(bible.playlistSelectedEntryIndex).toBe(9);
    });
  });

  // ─── playlistEntries ──────────────────────────────────────────────────────────

  describe("playlistEntries", () => {
    it("returns an empty array when initialized with default", () => {
      expect(makeBible().playlistEntries).toEqual([]);
    });

    it("returns a shallow copy of the stored entries", () => {
      const entry = { id: "entry-1" } as any;
      const bible = makeBible({ playlistEntries: [entry] });
      const snapshot = bible.playlistEntries!;
      snapshot.push({ id: "entry-99" } as any);
      expect(bible.playlistEntries).toHaveLength(1);
    });

    it("returns the stored entries by item reference", () => {
      const entry = { id: "entry-1" } as any;
      const bible = makeBible({ playlistEntries: [entry] });
      expect(bible.playlistEntries![0]).toBe(entry);
    });
  });

  // ─── playlistLastSelectedEntryItem ───────────────────────────────────────────

  describe("playlistLastSelectedEntryItem / changePlaylistLastSelectedItem", () => {
    it("changePlaylistLastSelectedItem stores the item", () => {
      const bible = makeBible();
      const entry = { id: "entry-1" } as any;
      bible.changePlaylistLastSelectedItem(entry);
      expect(bible.playlistLastSelectedEntryItem).toBe(entry);
    });

    it("changePlaylistLastSelectedItem overwrites the previous item", () => {
      const bible = makeBible();
      const e1 = { id: "entry-1" } as any;
      const e2 = { id: "entry-2" } as any;
      bible.changePlaylistLastSelectedItem(e1);
      bible.changePlaylistLastSelectedItem(e2);
      expect(bible.playlistLastSelectedEntryItem).toBe(e2);
    });
  });

  // ─── isYear ───────────────────────────────────────────────────────────────────

  describe("isYear / enableIsYear / disableIsYear", () => {
    it("disableIsYear sets isYear to false", () => {
      const bible = makeBible();
      bible.disableIsYear();
      expect(bible.isYear).toBe(false);
    });

    it("enableIsYear sets isYear back to true", () => {
      const bible = makeBible();
      bible.disableIsYear();
      bible.enableIsYear();
      expect(bible.isYear).toBe(true);
    });
  });

  // ─── isShowYear ───────────────────────────────────────────────────────────────

  describe("isShowYear / enableIsShowYear / disableIsShowYear", () => {
    it("enableIsShowYear sets isShowYear to true", () => {
      const bible = makeBible();
      bible.enableIsShowYear();
      expect(bible.isShowYear).toBe(true);
    });

    it("disableIsShowYear sets isShowYear to false", () => {
      const bible = makeBible();
      bible.enableIsShowYear();
      bible.disableIsShowYear();
      expect(bible.isShowYear).toBe(false);
    });
  });

  // ─── areDatesEnabled ──────────────────────────────────────────────────────────

  describe("areDatesEnabled / enableDates / disableDates", () => {
    it("enableDates sets areDatesEnabled to true", () => {
      const bible = makeBible();
      bible.enableDates();
      expect(bible.areDatesEnabled).toBe(true);
    });

    it("disableDates sets areDatesEnabled to false", () => {
      const bible = makeBible();
      bible.enableDates();
      bible.disableDates();
      expect(bible.areDatesEnabled).toBe(false);
    });
  });
});
