// async function RecordFile()
// {
//     const files = await os.showUploadFiles();

//     if (files.length <= 0) {
//         return;
//     }

//     const recordKey = await os.getPublicRecordKey('Canvas');

//     if (!recordKey.success) 
//     {
//         os.toast('Failed ' + recordKey.errorMessage);
//         return
//     }

//     files.forEach(async (file) => {
//         const result = await os.recordFile(recordKey.recordKey, file);

//         if (result.success) { 
//             console.log("Success! Uploaded to " + result.url);
//         } else {
//             console.log("Failed " + result.errorMessage);
//         }
//     })
// }

if(that.keys[0] === "1")
{
    // RecordFile()
}
// if(that.keys[0] === "Control")
// {
//     setTagMask(thisBot, "isControlPressed", true);
// }
// if((that.keys[0] === "z" || that.keys[0] === "Z") && thisBot.masks.isControlPressed)
// {
//     thisBot.TryUndoHighlight();
// }
// if((that.keys[0] === "y" || that.keys[0] === "Y") && thisBot.masks.isControlPressed)
// {
//     thisBot.TryRedoHighlight();
// }