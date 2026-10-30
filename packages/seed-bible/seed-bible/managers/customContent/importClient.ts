import {
  importApiErrorSchema,
  importProgressSchema,
  siteImportSchema,
  type ImportProgress,
  type PublishRequest,
  type SiteImport,
  type StartImportRequest,
  type StartSiteImportRequest,
} from "./importApi";
import { ContentLibraryError } from "./publish";
import { contentChapterIndexSchema, type ContentChapterIndex } from "./schema";

/** What the editor asks of the import worker. Every call acts as the owner, with their session key. */
export interface ContentImportService {
  startImport: (
    sessionKey: string,
    request: StartImportRequest
  ) => Promise<ImportProgress>;
  getImport: (sessionKey: string, id: string) => Promise<ImportProgress>;
  /** The import still running (or paused) for a library, if any. */
  findActiveImport: (
    sessionKey: string,
    contentRecordName: string
  ) => Promise<ImportProgress | null>;
  cancelImport: (sessionKey: string, id: string) => Promise<ImportProgress>;
  /** Continues a paused import with a fresh session key. */
  resumeImport: (sessionKey: string, id: string) => Promise<ImportProgress>;
  publish: (
    sessionKey: string,
    request: PublishRequest
  ) => Promise<ContentChapterIndex>;
  /** Starts looking a website up in Common Crawl. */
  startSiteImport: (
    sessionKey: string,
    request: StartSiteImportRequest
  ) => Promise<SiteImport>;
  /** A website import's lookup, with the pages found once it's done. */
  getSiteImport: (sessionKey: string, id: string) => Promise<SiteImport>;
  /** Imports the chosen pages of a website import. */
  pickSitePages: (
    sessionKey: string,
    id: string,
    itemIds: readonly string[]
  ) => Promise<ImportProgress>;
}

/** The import worker's HTTP API, at `baseUrl`. */
export function createContentImportClient(
  baseUrl: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): ContentImportService {
  const root = baseUrl.replace(/\/+$/, "");

  const call = async (
    sessionKey: string,
    method: "GET" | "POST",
    path: string,
    body?: unknown
  ): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${sessionKey}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new ContentLibraryError(
        "network_error",
        `The import service couldn't be reached: ${String(error)}`
      );
    }
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = importApiErrorSchema.safeParse(json);
      throw new ContentLibraryError(
        parsed.success ? parsed.data.error : `http_${response.status}`,
        parsed.success
          ? (parsed.data.message ?? parsed.data.error)
          : `The import service answered ${response.status}.`
      );
    }
    return json;
  };

  const progress = (json: unknown): ImportProgress => {
    const parsed = importProgressSchema.safeParse(json);
    if (!parsed.success) {
      throw new ContentLibraryError(
        "invalid_response",
        "The import service sent an unexpected answer."
      );
    }
    return parsed.data;
  };

  const site = (json: unknown): SiteImport => {
    const parsed = siteImportSchema.safeParse(json);
    if (!parsed.success) {
      throw new ContentLibraryError(
        "invalid_response",
        "The import service sent an unexpected answer."
      );
    }
    return parsed.data;
  };

  return {
    startSiteImport: async (sessionKey, request) =>
      site(await call(sessionKey, "POST", "/site-imports", request)),
    getSiteImport: async (sessionKey, id) =>
      site(
        await call(sessionKey, "GET", `/site-imports/${encodeURIComponent(id)}`)
      ),
    pickSitePages: async (sessionKey, id, itemIds) =>
      progress(
        await call(
          sessionKey,
          "POST",
          `/site-imports/${encodeURIComponent(id)}/pick`,
          { itemIds }
        )
      ),
    startImport: async (sessionKey, request) =>
      progress(await call(sessionKey, "POST", "/imports", request)),
    getImport: async (sessionKey, id) =>
      progress(
        await call(sessionKey, "GET", `/imports/${encodeURIComponent(id)}`)
      ),
    findActiveImport: async (sessionKey, contentRecordName) => {
      const json = await call(
        sessionKey,
        "GET",
        `/imports?contentRecordName=${encodeURIComponent(contentRecordName)}`
      );
      return json === null ? null : progress(json);
    },
    cancelImport: async (sessionKey, id) =>
      progress(
        await call(
          sessionKey,
          "POST",
          `/imports/${encodeURIComponent(id)}/cancel`
        )
      ),
    resumeImport: async (sessionKey, id) =>
      progress(
        await call(
          sessionKey,
          "POST",
          `/imports/${encodeURIComponent(id)}/resume`
        )
      ),
    publish: async (sessionKey, request) => {
      const parsed = contentChapterIndexSchema.safeParse(
        await call(sessionKey, "POST", "/publish", request)
      );
      if (!parsed.success) {
        throw new ContentLibraryError(
          "invalid_response",
          "The import service sent an unexpected answer."
        );
      }
      return parsed.data;
    },
  };
}
