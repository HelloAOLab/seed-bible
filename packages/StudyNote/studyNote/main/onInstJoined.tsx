// Initialize global references
if (!globalThis.StudyNoteExtension) {
    globalThis.StudyNoteExtension = thisBot;
}

// Initialize state tags if not present
if (!tags.studyNotesActiveTab) {
    setTagMask(thisBot, 'studyNotesActiveTab', 'notes');
}

if (!tags.previousTab) {
    setTagMask(thisBot, 'previousTab', {});
}

if (!tags._prevTabCache) {
    setTagMask(thisBot, '_prevTabCache', {});
}

if (!tags.shouldHighlight) {
    setTagMask(thisBot, 'shouldHighlight', true);
}

if (!tags.canHighlight) {
    setTagMask(thisBot, 'canHighlight', true);
}

// Setup schedule highlight function
globalThis.ScheduleHighlight = (payload, highlightSection) => {
    const intervalId = setInterval(() => {
        if (thisBot?.tags.canHighlight) {
            clearInterval(intervalId);
            highlightSection(payload);
        } else {
            console.log("retrying to highlight...", thisBot?.tags.canHighlight);
        }
    }, 500);
};

console.log('StudyNote extension initialized');




