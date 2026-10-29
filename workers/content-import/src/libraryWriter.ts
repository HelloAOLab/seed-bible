import { publishRequestSchema } from "../../../packages/seed-bible/seed-bible/managers/customContent/importApi";
import {
  ContentLibraryError,
  publishChapters,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/publish";
import { z } from "zod";
import { createCasualOSClient, isFatalSessionError } from "./casualos";
import { defaultDeps, type WorkerDeps } from "./deps";
import type { Env } from "./platform";

const writerRequestSchema = publishRequestSchema.extend({
  sessionKey: z.string().min(1),
});

function statusFor(code: string): number {
  if (isFatalSessionError(code) || code === "not_logged_in") {
    return 401;
  }
  if (code === "not_authorized") {
    return 403;
  }
  if (code === "library_not_found") {
    return 404;
  }
  return 502;
}

/**
 * The one place a library's chapter records and chapter index are written
 * (a Durable Object per content record, so there's exactly one per library).
 *
 * A Durable Object handles one request at a time only until it awaits a
 * `fetch`; publishing awaits CasualOS on every chapter, so requests are
 * chained here to make sure two publishes never interleave. Nothing is kept
 * between requests: a publish cut short by a restart fails back to its
 * caller, and publishing again (or the editor's "Rebuild index") repairs it,
 * because chapters are always rebuilt from the items.
 */
export class LibraryWriter {
  private chain: Promise<unknown> = Promise.resolve();
  private readonly deps: WorkerDeps;

  constructor(
    _state: unknown,
    private readonly env: Env,
    deps: WorkerDeps = defaultDeps
  ) {
    this.deps = deps;
  }

  async fetch(request: Request): Promise<Response> {
    const parsed = writerRequestSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    const run = this.chain.then(() => this.publish(parsed.data));
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async publish(
    request: z.infer<typeof writerRequestSchema>
  ): Promise<Response> {
    const client = createCasualOSClient(
      this.env.CASUALOS_ENDPOINT,
      request.sessionKey,
      this.deps.fetch
    );
    try {
      const index = await publishChapters(
        client.store,
        request.contentRecordName,
        {
          keys: request.keys,
          full: request.full,
          now: this.deps.now(),
        }
      );
      return Response.json(index);
    } catch (error) {
      const code =
        error instanceof ContentLibraryError ? error.code : "server_error";
      if (!(error instanceof ContentLibraryError)) {
        console.error("Publishing failed:", error);
      }
      return Response.json(
        { error: code, message: (error as Error).message },
        { status: statusFor(code) }
      );
    }
  }
}
