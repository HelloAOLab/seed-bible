import ReferenceModal from "references.manager.NewReferenceModal";
import {
  GetReferences,
  CalculatePopupPosition,
} from "references.manager.GetReferences";
import type { ReferencesInterface } from "references.manager.interfaces";

const { book, chapter, verse, mouseEvent, baseUrl, translation, bookId } = that;

const ToggleReferenceModal = async () => {
  const reference: ReferencesInterface = await GetReferences({
    bookId: bookId,
    chapter,
    verse,
    baseUrl,
    translation,
    bookName: book,
  });

  if (!reference || !reference.references || reference.references.length == 0) {
    return;
  }
  if (globalThis?.closePopupSettings) {
    globalThis.closePopupSettings();
  }

  if (globalThis?.openPopupSettings) {
    await os.sleep(100);
    const position = CalculatePopupPosition(mouseEvent);
    globalThis.openPopupSettings(
      <ReferenceModal reference={reference} />,
      null,
      true,
      position
    );
  }
};

await ToggleReferenceModal();
