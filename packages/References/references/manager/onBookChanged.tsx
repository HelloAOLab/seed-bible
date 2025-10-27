// import ReferenceComponent from "references.manager.ReferenceComponent";
// const { bookId, chapter } = that;

// let referenceKeys = [];

// if (masks.keys) {
//     masks.keys.forEach(key => {
//         if (key.includes(`${bookId}.${chapter}`)) {
//             referenceKeys.push(key)
//         }
//     })
// } else {
//     setTagMask(thisBot, "keys", Object.keys({ ...tags.references }), "local");
//     masks.keys.forEach(key => {
//         if (key.includes(`${bookId}.${chapter}`)) {
//             referenceKeys.push(key)
//         }
//     })
// }

// let verses = referenceKeys.map(item => Number(item.split(".")[2]));

// await os.sleep(2000);

// AddContexts.map(AddContext => {
//     AddContext({
//         verses,
//         contextMenu: async (e, book, chapter, verse) => {
//             e.stopPropagation();
//             e.preventDefault();
//             const references = () => {
//                 let referenceManager = getBot('system', 'references.manager');
//                 const verseNumber = verse.verseNumber;
//                 const key = `${tags.NameToId[book]}.${chapter}.${verseNumber}`;
//                 console.log(key, "key")
//                 const referencesArray = referenceManager.tags.references[key];
//                 return {
//                     key,
//                     referencesArray: referencesArray.map(item => item.split(",")[0])
//                 }
//             }
//             await os.sleep(200);
//             // openPopupSettings(
//             //     <ReferenceComponent references={references()} />,
//             //     null,
//             //     true
//             // )
            
//         },
//     });
// })