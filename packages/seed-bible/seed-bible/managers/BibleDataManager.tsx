import { signal, effect, type Signal } from "@preact/signals";
import {
  FreeUseBibleAPI,
  type Translation,
  type TranslationBookChapter,
  type TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";

export interface BibleDataManager {
  endpoints: Signal<string[]>;
  availableTranslations: Signal<Translation[]>;
  translationBooks: Signal<Map<string, TranslationBooks>>;
  api: FreeUseBibleAPI;
  getTranslations: (endpoint?: string) => Promise<Translation[]>;
  getEndpointForTranslation: (translationId: string) => string;
  getTranslationBooks: (translationId: string) => Promise<TranslationBooks>;
  getTranslationBookChapter: (
    translationId: string,
    book: string,
    chapter: number | string
  ) => Promise<TranslationBookChapter>;
  getNextChapter: (
    chapter: TranslationBookChapter
  ) => Promise<TranslationBookChapter | null>;
  getPreviousChapter: (
    chapter: TranslationBookChapter
  ) => Promise<TranslationBookChapter | null>;

  /**
   * Gets the API endpoint associated with a given translation. If the translation is not associated with a specific endpoint, it returns the default endpoint.
   * @param translationId The ID of the translation for which to retrieve the API endpoint.
   * @returns
   */
  getTranslationEndpointInfo: (translationId: string) => {
    translationId: string;
    endpoint: string;
    isDefault: boolean;
  };
}

function normalizeEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    if (!url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
    }
    return url.href;
  } catch {
    return endpoint;
  }
}

export function createBibleDataManager(
  api: FreeUseBibleAPI = new FreeUseBibleAPI()
): BibleDataManager {
  const defaultEndpoint = normalizeEndpoint(api.endpoint);
  const endpoints = signal<string[]>([defaultEndpoint]);
  const availableTranslations = signal<Translation[]>([]);
  const translationBooks = signal<Map<string, TranslationBooks>>(new Map());
  const translationEndpoints = signal<Map<string, string>>(new Map());

  const getTranslationEndpointInfo = (translationId: string) => {
    const endpoint = getEndpointForTranslation(translationId);
    return {
      translationId,
      endpoint,
      isDefault: endpoint === defaultEndpoint,
    };
  };

  const getEndpointForTranslation = (translationId: string): string => {
    return translationEndpoints.value.get(translationId) ?? defaultEndpoint;
  };

  const ensureEndpointTracked = (endpoint: string) => {
    if (endpoints.value.includes(endpoint)) {
      return;
    }
    endpoints.value = [...endpoints.value, endpoint];
  };

  const mergeTranslations = (
    endpoint: string,
    nextTranslations: Translation[]
  ) => {
    const merged = new Map(
      availableTranslations.value.map((translation) => [
        translation.id,
        translation,
      ])
    );

    const nextTranslationEndpoints = new Map(translationEndpoints.value);
    for (const translation of nextTranslations) {
      merged.set(translation.id, translation);
      nextTranslationEndpoints.set(translation.id, endpoint);
    }

    availableTranslations.value = Array.from(merged.values());
    translationEndpoints.value = nextTranslationEndpoints;
  };

  const getTranslations = async (endpoint?: string): Promise<Translation[]> => {
    const normalizedEndpoint = normalizeEndpoint(endpoint ?? defaultEndpoint);
    ensureEndpointTracked(normalizedEndpoint);

    const result = await api.getAvailableTranslations(normalizedEndpoint);
    mergeTranslations(normalizedEndpoint, result.translations);
    return result.translations;
  };

  const getTranslationBooks = async (
    translationId: string
  ): Promise<TranslationBooks> => {
    const existing = translationBooks.value.get(translationId);
    if (existing) {
      return existing;
    }

    const endpoint = getEndpointForTranslation(translationId);
    const books = await api.getTranslationBooks(translationId, endpoint);

    const nextBooksMap = new Map(translationBooks.value);
    nextBooksMap.set(translationId, books);
    translationBooks.value = nextBooksMap;

    mergeTranslations(endpoint, [books.translation]);
    return books;
  };

  const getTranslationBookChapter = async (
    translationId: string,
    book: string,
    chapter: number | string
  ): Promise<TranslationBookChapter> => {
    const endpoint = getEndpointForTranslation(translationId);
    return await api.getTranslationBookChapter(
      translationId,
      book,
      chapter,
      endpoint
    );
  };

  const getNextChapter = async (chapter: TranslationBookChapter) => {
    const endpoint = getEndpointForTranslation(chapter.translation.id);
    return await api.getNextChapter(chapter, endpoint);
  };

  const getPreviousChapter = async (chapter: TranslationBookChapter) => {
    const endpoint = getEndpointForTranslation(chapter.translation.id);
    return await api.getPreviousChapter(chapter, endpoint);
  };

  effect(() => {
    if (availableTranslations.value.length > 0) {
      window.localStorage.setItem(
        "availableTranslations",
        JSON.stringify(availableTranslations.value)
      );
    }
  });

  effect(() => {
    const stored = window.localStorage.getItem("availableTranslations");
    if (stored) {
      const parsed: Translation[] = JSON.parse(stored);
      availableTranslations.value = parsed;
    }
  });

  effect(() => {
    if (translationEndpoints.value.size > 0) {
      window.localStorage.setItem(
        "endpoints",
        JSON.stringify(Array.from(translationEndpoints.value.entries()))
      );
    }
  });

  effect(() => {
    const stored = window.localStorage.getItem("endpoints");
    if (stored) {
      const parsed: [string, string][] = JSON.parse(stored);
      translationEndpoints.value = new Map(parsed);
    }
  });

  return {
    endpoints,
    availableTranslations,
    translationBooks,
    api,
    getTranslations,
    getEndpointForTranslation,
    getTranslationBooks,
    getTranslationBookChapter,
    getNextChapter,
    getPreviousChapter,
    getTranslationEndpointInfo,
  };
}
