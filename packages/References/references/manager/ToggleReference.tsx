import ReferenceApp from "references.manager.NewReferenceApp";
const { book, chapter, verse } = that;

const reference = await thisBot.GetReferences({bookId: tags.NameToId[book], chapter, verse});

if (globalThis?.SetCurrentReference && globalThis?.currentReferenceKey !== `${tags.NameToId[book]}.${chapter}.${verse}`) {
    globalThis.SetCurrentReference(reference);
    return
}

globalThis.currentReference = `${tags.NameToId[book]}.${chapter}.${verse}`;

const panelKey = `reference_PANEL_ID`;

if (globalThis.makingApp === "reference") {
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

if (globalThis.CurrentPanelAvailable) {
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