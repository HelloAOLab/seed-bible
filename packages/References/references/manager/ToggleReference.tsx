import ReferenceApp from "references.manager.ReferenceApp";
const { book, chapter, verse } = that;
const verseNumber = verse.verseNumber;

const references = () => {
    let referenceManager = getBot('system', 'references.manager');
    const key = `${tags.NameToId[book]}.${chapter}.${verseNumber}`;
    console.log(key, "key")
    const referencesArray = referenceManager.tags.references[key];
    return {
        key,
        referencesArray: referencesArray.map(item => item.split(",")[0])
    }
}

console.log(globalThis.currentReference, "globalThis.currentReference")

if (globalThis.currentReference && globalThis?.SetReferenceArray && globalThis?.SetReferenceArrayKey && globalThis.currentReference !== `${tags.NameToId[book]}.${chapter}.${verseNumber}`) {
    let referenceObj = references();
    globalThis.SetReferenceArray(referenceObj.referencesArray);
    globalThis.SetReferenceArrayKey(referenceObj.key);
    globalThis.currentReference = `${tags.NameToId[book]}.${chapter}.${verseNumber}`;;
    return
}

globalThis.currentReference = `${tags.NameToId[book]}.${chapter}.${verseNumber}`;

const panelKey = `reference_PANEL_ID`;

if (globalThis.makingApp === "reference") {
    RemoveApplicationByID(globalThis[panelKey]);
    globalThis[panelKey] = null;
    globalThis.makingApp = null;
    globalThis.currentReference = null;
    return;
}

console.log(book, chapter, verse, ReferenceApp)

const InitializedApp = ReferenceApp;
if (!InitializedApp) return;
const id = uuid();
globalThis[panelKey] = id;
globalThis.makingApp = "reference";

if (globalThis.CurrentPanelAvailable) {
    ReplaceApplication(globalThis.CurrentPanelAvailable, {
        id,
        App: <InitializedApp references={references()} id={id} />,
        to: "panel",
        minWidth: "23rem",
    });
    return;
}

AddApplication({
    id,
    App: <InitializedApp references={references()} id={id} />,
    to: "panel",
    minWidth: "23rem",
});