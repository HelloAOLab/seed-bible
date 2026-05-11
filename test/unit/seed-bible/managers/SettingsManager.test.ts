import { AppSettingsSchema } from "@packages/seed-bible/seed-bible/managers/SettingsManager";

describe("SettingsManager", () => {
  describe("AppSettingsSchema", () => {
    it("parses the current app settings shape", () => {
      const currentSettings = {
        bookOrientation: "traditional",
        uiTextSize: "M",
        selectionUI: {
          showSelectedItems: true,
          showHighlightColors: true,
          showIconText: true,
        },
        scriptureElements: {
          showHeadings: true,
          showVerseNumbers: true,
          showFootnotes: true,
          showCrossReferences: true,
          showStudyNotes: true,
          showDiscoveredContent: true,
          showHighlights: true,
          showRedLettering: true,
        },
        textConfig: {
          bookTitle: {
            font: "'Newsreader', serif",
            weight: "700",
            color: "",
            marginVertical: 12,
            marginHorizontal: 0,
            bold: true,
            italic: false,
            underline: false,
            alignment: "unset",
          },
          heading: {
            font: "'Plus Jakarta Sans', sans-serif",
            weight: "300",
            color: "",
            marginVertical: 18,
            marginHorizontal: 0,
            bold: false,
            italic: true,
            underline: false,
            alignment: "unset",
          },
          verse: {
            font: "'Newsreader', serif",
            weight: "400",
            color: "",
            marginVertical: 0,
            marginHorizontal: 0,
            bold: false,
            italic: false,
            underline: false,
            alignment: "unset",
            lineHeight: 2,
          },
        },
        toolbar: {
          hidden: [],
          order: [],
        },
        keepScreenAwake: false,
        customHighlightColors: [],
        scriptureMargin: 27,
        showNavArrows: true,
      };

      expect(() => AppSettingsSchema.parse(currentSettings)).not.toThrow();
    });
  });
});
