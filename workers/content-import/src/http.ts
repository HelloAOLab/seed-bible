import { readLibraryManifest } from "../../../packages/seed-bible/seed-bible/managers/customContent/publish";
import {
  CONTENT_IMPORT_STATUS_ADDRESS,
  CONTENT_IMPORT_STATUS_MARKER,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/schema";
import type { CasualOSClient } from "./casualos";

/** An API failure, answered as `{ error: code, message, ...extra }`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    readonly extra: Record<string, unknown> = {}
  ) {
    super(message ?? code);
  }
}

/** Who is calling, already checked with CasualOS. */
export interface Caller {
  userId: string;
  sessionKey: string;
  client: CasualOSClient;
}

export async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "invalid_request", "The request body isn't JSON.");
  }
}

/**
 * Checks the caller may import into a library before anything is queued:
 * reading the manifest proves the library exists (and finds its default
 * author), and writing the status entry proves the caller may write to it.
 */
export async function checkLibraryAccess(
  caller: Caller,
  contentRecordName: string,
  now: number
): Promise<{ defaultAuthor: string | null }> {
  let defaultAuthor: string | null = null;
  try {
    defaultAuthor =
      (await readLibraryManifest(caller.client.store, contentRecordName))
        .defaultAuthor ?? null;
  } catch {
    throw new HttpError(404, "library_not_found");
  }
  const probe = await caller.client.store.recordData(
    contentRecordName,
    CONTENT_IMPORT_STATUS_ADDRESS,
    { status: "starting", updatedAt: now },
    CONTENT_IMPORT_STATUS_MARKER
  );
  if (!probe.success) {
    if (
      probe.errorCode === "not_authorized" ||
      probe.errorCode === "record_not_found"
    ) {
      throw new HttpError(
        403,
        "not_authorized",
        "You can't change this library."
      );
    }
    throw new HttpError(
      502,
      "casualos_unavailable",
      "CasualOS couldn't be reached. Please try again."
    );
  }
  return { defaultAuthor };
}
