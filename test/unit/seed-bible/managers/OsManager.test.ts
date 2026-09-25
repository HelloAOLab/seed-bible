import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import { awaitDocumentSync } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { Subject } from "rxjs";

/**
 * A document that reports status but is never actually connected to anything.
 *
 * Only the two members {@link awaitDocumentSync} touches are real. The status
 * subject stands in for the branch: pushing values through it is how a test says
 * what the server told this document.
 */
function fakeDocument() {
  const onStatusUpdated = new Subject<{ type: string; synced?: boolean }>();
  const unsubscribe = vi.fn(() => {
    onStatusUpdated.complete();
  });
  return {
    onStatusUpdated,
    unsubscribe,
    doc: {
      onStatusUpdated,
      unsubscribe,
    } as unknown as Pick<SharedDocument, "onStatusUpdated" | "unsubscribe">,
  };
}

describe("awaitDocumentSync", () => {
  it("resolves once the branch reports itself synced", async () => {
    const fake = fakeDocument();
    const pending = awaitDocumentSync(fake.doc, 10_000);

    fake.onStatusUpdated.next({ type: "sync", synced: true });

    await expect(pending).resolves.toBeUndefined();
    // The document is about to be handed to the caller, so it has to keep
    // watching its branch.
    expect(fake.unsubscribe).not.toHaveBeenCalled();
  });

  it("ignores the statuses that come before a sync", async () => {
    const fake = fakeDocument();
    const pending = awaitDocumentSync(fake.doc, 10_000);

    fake.onStatusUpdated.next({ type: "connection", synced: false });
    fake.onStatusUpdated.next({ type: "sync", synced: false });
    fake.onStatusUpdated.next({ type: "sync", synced: true });

    await expect(pending).resolves.toBeUndefined();
    expect(fake.unsubscribe).not.toHaveBeenCalled();
  });

  it("gives up on a document that reports failure without ever erroring", async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeDocument();
      const settled = expect(
        awaitDocumentSync(fake.doc, 10_000)
      ).rejects.toThrow();

      // The shape of an expired session key or a refused record: the document
      // says it isn't authorized and isn't synced, and then says nothing more.
      // Neither status errors and neither completes the stream, so without the
      // deadline this waits for the rest of the page load.
      fake.onStatusUpdated.next({ type: "authorization", synced: false });
      fake.onStatusUpdated.next({ type: "sync", synced: false });

      await vi.advanceTimersByTimeAsync(10_000);
      await settled;

      // The one that matters: a document nobody will be handed must let go of
      // its branch watch. Without this, every retry leaves another connected
      // document behind for the rest of the page load.
      expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps waiting right up to the deadline", async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeDocument();
      const pending = awaitDocumentSync(fake.doc, 10_000);

      // A slow connection that syncs at the last moment is still a success, so
      // the deadline must not be tightened into a race the network can lose.
      await vi.advanceTimersByTimeAsync(9_999);
      expect(fake.unsubscribe).not.toHaveBeenCalled();

      fake.onStatusUpdated.next({ type: "sync", synced: true });
      await expect(pending).resolves.toBeUndefined();
      expect(fake.unsubscribe).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits indefinitely when no deadline is asked for", async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeDocument();
      let settled = false;
      void awaitDocumentSync(fake.doc).then(
        () => (settled = true),
        () => (settled = true)
      );

      // Multiplayer sessions want a document or nothing, and have no fallback to
      // fall back to — so they are not given a deadline they never asked for.
      await vi.advanceTimersByTimeAsync(10 * 60_000);

      expect(settled).toBe(false);
      expect(fake.unsubscribe).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("releases a document whose connection errored", async () => {
    const fake = fakeDocument();
    const settled = expect(awaitDocumentSync(fake.doc, 10_000)).rejects.toThrow(
      "connection lost"
    );

    fake.onStatusUpdated.error(new Error("connection lost"));

    await settled;
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
