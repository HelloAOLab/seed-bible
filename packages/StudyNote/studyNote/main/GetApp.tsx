const StudyNotes = await thisBot.StudyNotes();
if(!globalThis.studyNotesPresent) {
    globalThis.studyNotesPresent = true;
}
return StudyNotes;

