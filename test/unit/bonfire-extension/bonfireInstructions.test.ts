import { buildBonfireCustomInstructions } from "@packages/bonfire-extension/ext_Bonfire/main/bonfireInstructions";

describe("buildBonfireCustomInstructions", () => {
  it("keeps the reading note when no catalog list is available", () => {
    expect(
      buildBonfireCustomInstructions({
        bookId: "JHN",
        chapterNumber: 3,
        translationLabel: "Berean Standard Bible",
        translationShortName: "BSB",
        uiLanguage: "fr-FR",
        availableTranslationsNote: null,
      })
    ).toBe(
      "You are chatting with a user who is reading the Bible. They are currently reading: JHN 3. Prefer the Bible translation Berean Standard Bible (BSB). Reply in fr-FR."
    );
  });

  it("appends the translations the reader can actually open", () => {
    const note = buildBonfireCustomInstructions({
      bookId: "GEN",
      chapterNumber: 1,
      translationLabel: "Berean Standard Bible",
      translationShortName: "BSB",
      uiLanguage: "fr-FR",
      availableTranslationsNote:
        "Translations available in French: JND (fra_jnd), LSG (fra_lsg), NCL (fra_ncl), OST (fra_ost). Only recommend translations from this list.",
    });

    expect(note).toContain(
      "Prefer the Bible translation Berean Standard Bible (BSB)."
    );
    expect(note).toContain("LSG (fra_lsg)");
    expect(note).toContain("Only recommend translations from this list.");
  });
});
