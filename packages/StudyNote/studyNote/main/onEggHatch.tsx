// Pre-fetch initial study note data if BookId available
if (globalThis.BookId && globalThis.GlobalChapter !== undefined) {
    const studyNoteDataURL = thisBot.tags[globalThis.BookId];
    
    if (studyNoteDataURL) {
        try {
            console.log("Pre-fetching study note data for:", globalThis.BookId, "chapter:", globalThis.GlobalChapter);
            const studyNoteData = await os.getFile(studyNoteDataURL);
            const note = [studyNoteData[globalThis.GlobalChapter]];
            setTagMask(thisBot, 'currentStudyNote', note);
            console.log("Successfully pre-fetched study note data");
        } catch (err) {
            console.warn('Failed to pre-fetch study note:', err);
        }
    }
}




