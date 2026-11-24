import { z } from "zod";
import {
  MAX_CONTENT_DESCRIPTION_LENGTH,
  MAX_CONTENT_TITLE_LENGTH,
  MAX_CONTENT_URL_LENGTH,
  contentReferenceSchema,
} from "./schema";

/**
 * The import worker's HTTP API, shared by the worker and the editor's client
 * so the two can't disagree about a request's shape.
 * See `docs/custom-content-database.md` §5.8.
 */

/** Most links one import may carry. */
export const MAX_IMPORT_ITEMS = 10_000;

/**
 * One link to import. Anything the owner already supplied (from a CSV) is
 * kept as given instead of being filled in automatically.
 */
export const importItemInputSchema = z.object({
  url: z.string().min(1).max(MAX_CONTENT_URL_LENGTH),
  title: z.string().max(MAX_CONTENT_TITLE_LENGTH).optional(),
  description: z.string().max(MAX_CONTENT_DESCRIPTION_LENGTH).optional(),
  author: z.string().max(200).optional(),
  categoryIds: z.array(z.string()).max(20).optional(),
  references: z.array(contentReferenceSchema).max(50).optional(),
  /** For a page found in Common Crawl: where its saved copy is. */
  site: z
    .object({
      sourceId: z.string().min(1).max(100),
      crawlId: z.string().min(1).max(100),
      capturedAt: z.string().max(20),
      filename: z.string().min(1).max(500),
      offset: z.number().int().nonnegative(),
      length: z.number().int().positive(),
    })
    .optional(),
});

export type ImportItemInput = z.infer<typeof importItemInputSchema>;

export const startImportRequestSchema = z.object({
  contentRecordName: z.string().min(1).max(200),
  items: z.array(importItemInputSchema).min(1).max(MAX_IMPORT_ITEMS),
});

export type StartImportRequest = z.infer<typeof startImportRequestSchema>;

export const IMPORT_JOB_STATUSES = [
  /** A website import, looking its pages up in Common Crawl. */
  "listing",
  /** A website import whose pages are listed, waiting for the owner to pick. */
  "awaiting_pick",
  "running",
  "paused_signin",
  "cancelled",
  "done",
  "expired",
] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

/** Statuses an import can still move on from. */
export const ACTIVE_IMPORT_STATUSES: readonly ImportJobStatus[] = [
  "listing",
  "awaiting_pick",
  "running",
  "paused_signin",
];

export const importProgressSchema = z.object({
  id: z.string(),
  contentRecordName: z.string(),
  kind: z.enum(["links", "site"]).default("links"),
  status: z.enum(IMPORT_JOB_STATUSES),
  total: z.number().int().nonnegative(),
  queued: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  /** Links left out because they were repeats within the import. */
  skipped: z.number().int().nonnegative(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ImportProgress = z.infer<typeof importProgressSchema>;

export const publishRequestSchema = z.object({
  contentRecordName: z.string().min(1).max(200),
  /** Chapter keys (`"JHN.3"`) to rebuild. */
  keys: z.array(z.string().max(20)).max(2000).optional(),
  /** Rebuild every chapter, repairing a publish that stopped partway. */
  full: z.boolean().optional(),
});

export type PublishRequest = z.infer<typeof publishRequestSchema>;

/** The shape of every error the worker returns. */
export const importApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  /** For `import_running`: the import already running for this library. */
  jobId: z.string().optional(),
});

/** Pages one website import may offer; narrower filters find the rest. */
export const MAX_SITE_PAGES = 2000;
/** How many of Common Crawl's latest crawls a website import looks in. */
export const SITE_CRAWLS = 3;

const pathPatternsSchema = z.array(z.string().trim().min(1).max(200)).max(20);

export const startSiteImportRequestSchema = z.object({
  contentRecordName: z.string().min(1).max(200),
  /** As the owner typed it, e.g. `gracecommunity.org/sermons/`. */
  site: z.string().min(1).max(500),
  include: pathPatternsSchema.optional(),
  exclude: pathPatternsSchema.optional(),
  /** "Check for new pages": the saved site this looks at again. */
  sourceId: z.string().min(1).max(100).optional(),
  /** Only look in crawls newer than this one. */
  sinceCrawlId: z.string().min(1).max(100).optional(),
});

export type StartSiteImportRequest = z.infer<
  typeof startSiteImportRequestSchema
>;

/** A page Common Crawl has, offered to the owner before anything is fetched. */
export const siteCandidateSchema = z.object({
  itemId: z.string(),
  url: z.string(),
  /** Common Crawl's 14-digit capture time. */
  capturedAt: z.string(),
});

export type SiteCandidate = z.infer<typeof siteCandidateSchema>;

export const siteImportSchema = z.object({
  progress: importProgressSchema,
  site: z.string(),
  include: z.array(z.string()),
  exclude: z.array(z.string()),
  sourceId: z.string(),
  /** The crawls looked in, newest first. Empty when none are newer than `sinceCrawlId`. */
  crawls: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Index result pages looked up so far, out of how many. */
  lookups: z.object({
    total: z.number().int().nonnegative(),
    done: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
  /** More pages matched than {@link MAX_SITE_PAGES}; only the first are offered. */
  capped: z.boolean(),
  /** Present once the lookup has finished. */
  candidates: z.array(siteCandidateSchema).optional(),
});

export type SiteImport = z.infer<typeof siteImportSchema>;

export const pickSitePagesRequestSchema = z.object({
  itemIds: z.array(z.string().min(1).max(100)).min(1).max(MAX_SITE_PAGES),
});

export type PickSitePagesRequest = z.infer<typeof pickSitePagesRequestSchema>;
