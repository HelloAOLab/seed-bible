import ReferenceApp from "references.manager.NewReferenceApp";
import { GetReferences } from "references.manager.GetReferences";
const { bookName, chapter, verse, baseUrl, translation, bookId } = that;

const reference = await GetReferences({
  bookId: bookId,
  chapter,
  verse,
  baseUrl,
  translation,
  bookName,
});

if (
  globalThis?.SetCurrentReference &&
  globalThis?.currentReferenceKey !== `${bookId}.${chapter}.${verse}`
) {
  globalThis.SetCurrentReference(reference);
  return;
}

globalThis.currentReference = `${bookId}.${chapter}.${verse}`;

const panelKey = `reference_PANEL_ID`;

if (globalThis?.makingApp === "reference") {
  RemoveApplicationByID(globalThis[panelKey]);
  globalThis[panelKey] = null;
  globalThis.makingApp = null;
  globalThis.currentReference = null;
  return;
}

const InitializedApp = ReferenceApp;
if (!InitializedApp) return;
const id = uuid();
globalThis[panelKey] = id;
globalThis.makingApp = "reference";

if (globalThis?.CurrentPanelAvailable) {
  ReplaceApplication(globalThis.CurrentPanelAvailable, {
    id,
    App: <InitializedApp reference={reference} />,
    to: "panel",
    minWidth: "23rem",
  });
  return;
}

AddApplication({
  id,
  App: <InitializedApp reference={reference} />,
  to: "panel",
  minWidth: "23rem",
});
