console.log("initializer open!!", globalThis.BookId, globalThis.GlobalChapter);
const getStudyNote = async () => {
    const studyNoteDataURL = tags[globalThis.BookId] ?? null;
    console.log("studyNoteDataURL: ", studyNoteDataURL);
    if (studyNoteDataURL) {
        const studyNoteData = await os.getFile(studyNoteDataURL);
        console.log("studyNoteData: ", studyNoteData);
        // if (!chapter || chapter < 0) return;
        if (![studyNoteData[globalThis.GlobalChapter]]) cancelled = true;
        let note = [studyNoteData[globalThis.GlobalChapter]];
        console.log("prefetched note: ", note);
        tags.currentStudyNote = note;
    }
}

getStudyNote();