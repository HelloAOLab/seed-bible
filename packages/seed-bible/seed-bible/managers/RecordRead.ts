import type * as z from "zod/v4";
import type { CasualOSManager } from "./OsManager";

type RecordResult = Awaited<ReturnType<CasualOSManager["getData"]>>;

/**
 * What a read of a record actually established.
 *
 * `absent` is a fact about the record: the server answered, and there is
 * nothing at that address. `error` means we never found out — the request
 * failed, or what came back wasn't the expected payload. Keeping them apart is
 * what stops a transient read failure from looking like a brand-new user.
 */
export type RecordRead<T> =
  | { status: "found"; value: T }
  | { status: "absent" }
  | { status: "error" };

export function readRecord<T>(
  result: RecordResult | undefined,
  schema: z.ZodType<T>,
  label: string
): RecordRead<T> {
  if (!result) {
    return { status: "error" };
  }
  if (!result.success) {
    // `data_not_found` is the only failure that means "there is no record
    // here". A server error, a rate limit, or an expired token all leave the
    // question open, so they are errors rather than absences.
    return result.errorCode === "data_not_found"
      ? { status: "absent" }
      : { status: "error" };
  }
  if (result.data === undefined || result.data === null) {
    return { status: "absent" };
  }
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) {
    console.warn(`Failed to parse ${label} payload:`, parsed.error);
    return { status: "error" };
  }
  return { status: "found", value: parsed.data };
}
