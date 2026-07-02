import { signal, effect } from "@preact/signals";
import type { Signal } from "@preact/signals";
import { convertAnnotationsToReadableFormat } from "ext_discover.helper.convertAnnotationsToReadableFormat";
import { fetchAnnotationsData } from "ext_discover.helper.fetchAnnotationsData";
import type { AnnotationManager } from "ext_discover.interfaces.managers.AnnotationManager";
import type { CurrentOpenedBook } from "ext_discover.models.playlist";

const G = globalThis as Record<string, any>;

export function createAnnotationManager(
  tab: Signal<string>
): AnnotationManager {
  const annotationData = signal<unknown[]>([]);
  const annotationSources = signal<unknown[]>([]);
  const tagsSources = signal<unknown[]>([]);
  const fetchingAnnotation = signal(false);
  const currentOpenedBook = signal<CurrentOpenedBook>({
    ...(G.CurrentBookData || {}),
  });
  const authSwitch = signal(false);

  let apiCallTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastFetchAddress: string | null = null;
  let lastFetchTab = "discover";

  const setAnnotationData = (
    value: unknown[] | ((prev: unknown[]) => unknown[])
  ) => {
    annotationData.value =
      typeof value === "function" ? value(annotationData.value) : value;
  };

  const setCurrentOpenedBook = (value: CurrentOpenedBook) => {
    currentOpenedBook.value = value;
  };

  const setAuthSwitch = (value: boolean) => {
    authSwitch.value = value;
  };

  effect(() => {
    G.SetCurrentBook = setCurrentOpenedBook;
  });

  effect(() => {
    G.SetAnnotationData = setAnnotationData;
    G.SetAuthSwtich = setAuthSwitch;
  });

  effect(() => {
    const currentTab = tab.value;
    const book = currentOpenedBook.value;
    const auth = authSwitch.value;

    if (apiCallTimeout) {
      clearTimeout(apiCallTimeout);
      apiCallTimeout = null;
    }

    if (!authBot) return;

    const address = `${authBot?.id}.${book?.bookId}.${book?.chapter}`;

    if (
      lastFetchAddress === address &&
      annotationData.value.length > 0 &&
      lastFetchTab === currentTab
    ) {
      return;
    }

    lastFetchTab = currentTab;
    lastFetchAddress = address;

    apiCallTimeout = setTimeout(() => {
      setAnnotationData([]);
      annotationSources.value = [];
      tagsSources.value = [];
      apiCallTimeout = null;

      if (!book?.bookId) return;

      void (async () => {
        try {
          fetchingAnnotation.value = true;

          const cacheKey = `${book.bookId}-${book.chapter}`;
          let annotations: unknown;

          if (G.AnnotationsData?.[cacheKey]) {
            annotations = G.AnnotationsData[cacheKey].data;
            void fetchAnnotationsData({ ...book });
            void fetchAnnotationsData({ ...book, prev: true });
            void fetchAnnotationsData({ ...book, next: true });
          } else {
            annotations = await fetchAnnotationsData({ ...book });
          }

          if (!annotations) return;

          let {
            allAnnotations,
            annotationSources: sources,
            tagsSources: tags,
          } = convertAnnotationsToReadableFormat({
            annotations,
            currentOpenedBook: book,
          });

          allAnnotations = allAnnotations.sort(G.AnnotationSortFunction);
          fetchingAnnotation.value = false;
          setAnnotationData(allAnnotations);
          annotationSources.value = sources;
          tagsSources.value = tags;
          G.UsedTags = [...tags];
        } catch (e) {
          console.log(e);
          fetchingAnnotation.value = false;
        }
      })();
    }, 200);
  });

  return {
    annotationData,
    annotationSources,
    tagsSources,
    fetchingAnnotation,
    currentOpenedBook,
    authSwitch,
    setAnnotationData,
    setCurrentOpenedBook,
    setAuthSwitch,
  };
}
