console.log("prepareStudyNoteData: ", that);
const {bookId, chapter} = that;

const getStudyNote = async () => {
    const studyNoteDataURL = tags[bookId] ?? null;
    if (studyNoteDataURL) {
        const studyNoteData = await os.getFile(studyNoteDataURL);
        // if (!chapter || chapter < 0) return;
        if (![studyNoteData[chapter]]) cancelled = true;
        let note = [studyNoteData[chapter]];
        tags.preparedStudyNote = note;
        console.log("study Note Lazy Loaded!");
    } else {
        setStudyNote([]);
        // reset any old highlights
        setSearchKey(null)
        setMatches([])
        setPointer(0)
        setHighlightedPos(null)
    }
}

getStudyNote();