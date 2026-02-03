import { getAnnotationRecord, loadAnnotations } from "db.annotations.library";

const isPrev = that?.prev;
const isNext = that?.next;

const chapter = isPrev ? that?.chapter - 1 : isNext ? that?.chapter + 1 : that?.chapter;

if(!globalThis.AnnotationsData) {
    globalThis.AnnotationsData = {};
}

if(!authBot?.id) {
    return { success: false, data: null };
}

// If last fetch was less than 15 minutes ago, return the cached data
if(globalThis.AnnotationsData[`${that?.bookId}-${chapter}`]) {
    if(new Date().getTime() - globalThis.AnnotationsData[`${that?.bookId}-${chapter}`].time < 15 * 60 * 1000) {
        return globalThis.AnnotationsData[`${that?.bookId}-${chapter}`].data;
    };
};

const userRecord = await getAnnotationRecord();
let annotations: any[] = [];
try {
    annotations = await loadAnnotations(
        userRecord,
        that?.bookId,
        chapter
    ) || [];

} catch (error) {
    annotations = [];
}

globalThis.AnnotationsData[`${that?.bookId}-${chapter}`] = {
    time: new Date().getTime(),
    data: annotations
};

return annotations;