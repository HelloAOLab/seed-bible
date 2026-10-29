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
});

export type ImportItemInput = z.infer<typeof importItemInputSchema>;

export const startImportRequestSchema = z.object({
  contentRecordName: z.string().min(1).max(200),
  items: z.array(importItemInputSchema).min(1).max(MAX_IMPORT_ITEMS),
});

export type StartImportRequest = z.infer<typeof startImportRequestSchema>;

export const IMPORT_JOB_STATUSES = [
  "running",
  "paused_signin",
  "cancelled",
  "done",
  "expired",
] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

/** Statuses an import can still move on from. */
export const ACTIVE_IMPORT_STATUSES: readonly ImportJobStatus[] = [
  "running",
  "paused_signin",
];

export const importProgressSchema = z.object({
  id: z.string(),
  contentRecordName: z.string(),
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
