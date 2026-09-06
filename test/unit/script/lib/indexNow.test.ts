import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Mock } from "vitest";
import {
  DEFAULT_INDEXNOW_ENDPOINT,
  INDEXNOW_MAX_URLS_PER_REQUEST,
  buildIndexNowPayload,
  readSubmissionLog,
  submitIndexNowBatch,
  writeSubmissionLog,
  type IndexNowSubmissionLog,
} from "../../../../script/lib/indexNow";

describe("readSubmissionLog / writeSubmissionLog", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "indexnow-log-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns an empty log when the file doesn't exist yet", async () => {
    const log = await readSubmissionLog(path.join(dir, "missing.json"));
    expect(log).toEqual({});
  });

  it("round-trips a log written to disk", async () => {
    const filePath = path.join(dir, "log.json");
    const log: IndexNowSubmissionLog = {
      "/en/AAB/genesis/1": {
        path: "/en/AAB/genesis/1",
        submittedSha256: "abc123",
        submittedAt: "2026-01-01T00:00:00.000Z",
      },
    };

    await writeSubmissionLog(filePath, log);
    const reloaded = await readSubmissionLog(filePath);

    expect(reloaded).toEqual(log);
  });

  it("propagates errors other than a missing file", async () => {
    // A directory can't be read as a file; readFile rejects with EISDIR.
    await expect(readSubmissionLog(dir)).rejects.toThrow();
  });
});

describe("buildIndexNowPayload", () => {
  it("shapes the JSON body from the given parameters", () => {
    const payload = buildIndexNowPayload({
      host: "seedbible.org",
      key: "the-key",
      keyLocation: "https://seedbible.org/the-key.txt",
      urlList: ["https://seedbible.org/en/AAB/genesis/1"],
    });

    expect(payload).toEqual({
      host: "seedbible.org",
      key: "the-key",
      keyLocation: "https://seedbible.org/the-key.txt",
      urlList: ["https://seedbible.org/en/AAB/genesis/1"],
    });
  });

  it("copies the url list rather than aliasing the input array", () => {
    const urlList = ["https://seedbible.org/en/AAB/genesis/1"];
    const payload = buildIndexNowPayload({
      host: "seedbible.org",
      key: "the-key",
      keyLocation: "https://seedbible.org/the-key.txt",
      urlList,
    });

    urlList.push("https://seedbible.org/en/AAB/genesis/2");
    expect(payload.urlList).toHaveLength(1);
  });
});

describe("submitIndexNowBatch", () => {
  let fetchMock: Mock;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = buildIndexNowPayload({
    host: "seedbible.org",
    key: "the-key",
    keyLocation: "https://seedbible.org/the-key.txt",
    urlList: ["https://seedbible.org/en/AAB/genesis/1"],
  });

  function response(status: number, statusText = "") {
    return {
      status,
      statusText,
      text: () => Promise.resolve(""),
    };
  }

  it("resolves on 200", async () => {
    fetchMock.mockResolvedValue(response(200, "OK"));
    await expect(submitIndexNowBatch(payload)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      DEFAULT_INDEXNOW_ENDPOINT,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      })
    );
  });

  it("resolves on 202", async () => {
    fetchMock.mockResolvedValue(response(202, "Accepted"));
    await expect(submitIndexNowBatch(payload)).resolves.toBeUndefined();
  });

  it("throws a descriptive error on 403, mentioning the key location", async () => {
    fetchMock.mockResolvedValue(response(403, "Forbidden"));
    await expect(submitIndexNowBatch(payload)).rejects.toThrow(
      /403.*keyLocation|403[\s\S]*the-key\.txt/i
    );
  });

  it("throws on 400", async () => {
    fetchMock.mockResolvedValue(response(400, "Bad Request"));
    await expect(submitIndexNowBatch(payload)).rejects.toThrow(/400/);
  });

  it("retries a 429 and eventually succeeds", async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(response(429, "Too Many Requests"))
        .mockResolvedValueOnce(response(200, "OK"));

      const result = submitIndexNowBatch(payload);
      await vi.runAllTimersAsync();

      await expect(result).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives up after repeated 429s", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValue(response(429, "Too Many Requests"));

      const result = submitIndexNowBatch(payload);
      // Attached before the timers advance so Node never sees this rejection
      // as unhandled, even momentarily, once the final retry rejects below.
      result.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(result).rejects.toThrow(/429/);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("INDEXNOW_MAX_URLS_PER_REQUEST", () => {
  it("matches the protocol's bulk submission limit", () => {
    expect(INDEXNOW_MAX_URLS_PER_REQUEST).toBe(10000);
  });
});
