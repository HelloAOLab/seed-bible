import { getAnnotationRecord, loadAnnotations } from "db.annotations.library";
const G = globalThis;

const isPrev = that?.prev;
const isNext = that?.next;

const chapter = isPrev
  ? that?.chapter - 1
  : isNext
    ? that?.chapter + 1
    : that?.chapter;

if (!G.AnnotationsData) {
  G.AnnotationsData = {};
}

// If last fetch was less than 15 minutes ago, return the cached data
if (G.AnnotationsData[`${that?.bookId}-${chapter}`]) {
  if (
    new Date().getTime() -
      G.AnnotationsData[`${that?.bookId}-${chapter}`].time <
    15 * 60 * 1000
  ) {
    return G.AnnotationsData[`${that?.bookId}-${chapter}`].data;
  }
}

const userRecord: any = await getAnnotationRecord();

if (!userRecord) {
  G.AnnotationsData = {};
  G.SetAnnotationData?.([]);
  return { success: false, data: null };
}

let annotations: any[] = [];
try {
  annotations =
    (await loadAnnotations(userRecord, that?.bookId, chapter)) || [];
} catch (error) {
  annotations = [];
}

G.AnnotationsData[`${that?.bookId}-${chapter}`] = {
  time: new Date().getTime(),
  data: annotations,
};

if (G.SetAnnotationData && that?.chapter === chapter) {
  let { allAnnotations } = thisBot.convertAnnotationsToReadableFormat({
    annotations,
    currentOpenedBook: G.CurrentBookData,
  });
  allAnnotations = allAnnotations.sort(G.AnnotationSortFunction);
  G.SetAnnotationData([...allAnnotations]);
}

return annotations;
