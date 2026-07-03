import {
  canonicalLabelFor,
  buildCanonicalMap,
  stripHash,
  formatBytes,
  diffSnapshots,
  renderReport,
  VENDOR_LABEL,
  INDEX_LABEL,
  type SizeSnapshot,
} from "../../../../script/lib/buildSizeReport";

function snapshot(overrides: Partial<SizeSnapshot> = {}): SizeSnapshot {
  return {
    outputs: [],
    totalBytes: 0,
    assetFiles: [],
    topFiles: [],
    ...overrides,
  };
}

describe("stripHash", () => {
  it("strips a trailing content hash before the extension", () => {
    expect(stripHash("vendor-DCGzEOOr.js")).toBe("vendor.js");
  });

  it("handles hashes containing hyphens/underscores", () => {
    expect(stripHash("locations-extension-1EVP_A0l.js")).toBe(
      "locations-extension.js"
    );
    expect(stripHash("en-BCa6xvG-.js")).toBe("en.js");
  });

  it("leaves unhashed filenames untouched", () => {
    expect(stripHash("sw.js")).toBe("sw.js");
  });
});

describe("canonicalLabelFor", () => {
  it("prefers the manifest name over the hashed filename", () => {
    expect(canonicalLabelFor("assets/vendor-DCGzEOOr.js", "vendor")).toBe(
      "assets/vendor.js"
    );
  });

  it("falls back to hash-stripping when no name is given", () => {
    expect(canonicalLabelFor("assets/foo-AbCdEfGh.js", undefined)).toBe(
      "assets/foo.js"
    );
  });
});

describe("buildCanonicalMap", () => {
  it("maps each entry's file to its manifest name", () => {
    const map = buildCanonicalMap({
      "_vendor-DCGzEOOr.js": {
        file: "assets/vendor-DCGzEOOr.js",
        name: "vendor",
      },
    });
    expect(map.get("assets/vendor-DCGzEOOr.js")).toBe("assets/vendor.js");
  });

  it("propagates the owning entry's name to its css files", () => {
    const map = buildCanonicalMap({
      "index.html": {
        file: "assets/index-5Jw90a8k.js",
        name: "index",
        css: ["assets/index-Bo2RveBp.css"],
      },
    });
    expect(map.get("assets/index-5Jw90a8k.js")).toBe("assets/index.js");
    expect(map.get("assets/index-Bo2RveBp.css")).toBe("assets/index.css");
  });

  it("does not map plain assets (left for the hash-stripping fallback)", () => {
    const map = buildCanonicalMap({
      "index.html": {
        file: "assets/index-5Jw90a8k.js",
        name: "index",
        assets: ["assets/logo-B6X9kU6O.png"],
      },
    });
    expect(map.has("assets/logo-B6X9kU6O.png")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats bytes below 1KB as-is", () => {
    expect(formatBytes(512)).toBe("512B");
  });

  it("formats KB/MB with one decimal below 10 units", () => {
    expect(formatBytes(1536)).toBe("1.5KB");
    expect(formatBytes(1258291)).toBe("1.2MB");
  });

  it("formats larger values without a decimal", () => {
    expect(formatBytes(12 * 1024 * 1024)).toBe("12MB");
  });

  it("only signs deltas when requested", () => {
    expect(formatBytes(1024, { signed: true })).toBe("+1KB");
    expect(formatBytes(-1024, { signed: true })).toBe("-1KB");
    expect(formatBytes(1024)).toBe("1KB");
  });
});

describe("diffSnapshots", () => {
  const THRESHOLD = 300 * 1024;

  it("flags an output whose size grows by more than the threshold", () => {
    const base = snapshot({
      outputs: [{ label: "Client bundle", path: "x", bytes: 1_000_000 }],
      totalBytes: 1_000_000,
    });
    const head = snapshot({
      outputs: [
        { label: "Client bundle", path: "x", bytes: 1_000_000 + 400 * 1024 },
      ],
      totalBytes: 1_000_000 + 400 * 1024,
    });

    const diff = diffSnapshots(head, base, THRESHOLD);
    expect(diff.outputs[0]!.flagged).toBe(true);
    expect(diff.totalFlagged).toBe(true);
  });

  it("does not flag a change right at the threshold boundary", () => {
    const base = snapshot({
      outputs: [{ label: "Client bundle", path: "x", bytes: 1_000_000 }],
      totalBytes: 1_000_000,
    });
    const head = snapshot({
      outputs: [
        { label: "Client bundle", path: "x", bytes: 1_000_000 + THRESHOLD },
      ],
      totalBytes: 1_000_000 + THRESHOLD,
    });

    const diff = diffSnapshots(head, base, THRESHOLD);
    expect(diff.outputs[0]!.flagged).toBe(false);
  });

  it("flags a change one byte over the threshold", () => {
    const base = snapshot({
      outputs: [{ label: "Client bundle", path: "x", bytes: 1_000_000 }],
      totalBytes: 1_000_000,
    });
    const head = snapshot({
      outputs: [
        {
          label: "Client bundle",
          path: "x",
          bytes: 1_000_000 + THRESHOLD + 1,
        },
      ],
      totalBytes: 1_000_000 + THRESHOLD + 1,
    });

    const diff = diffSnapshots(head, base, THRESHOLD);
    expect(diff.outputs[0]!.flagged).toBe(true);
  });

  it("marks a head-only asset file as added and a base-only file as removed", () => {
    const base = snapshot({
      assetFiles: [
        {
          label: "assets/old.js",
          relPath: "assets/old-a.js",
          bytes: 100,
          gzipBytes: 50,
        },
      ],
    });
    const head = snapshot({
      assetFiles: [
        {
          label: "assets/new.js",
          relPath: "assets/new-b.js",
          bytes: 100,
          gzipBytes: 50,
        },
      ],
    });

    const diff = diffSnapshots(head, base, THRESHOLD);
    const byLabel = new Map(diff.assetFiles.map((f) => [f.label, f]));
    expect(byLabel.get("assets/new.js")?.status).toBe("added");
    expect(byLabel.get("assets/old.js")?.status).toBe("removed");
  });
});

describe("renderReport", () => {
  it("renders a single-column table when no base snapshot is given", () => {
    const head = snapshot({
      outputs: [{ label: "Client bundle", path: "x", bytes: 1024 }],
      totalBytes: 1024,
      assetFiles: [
        {
          label: VENDOR_LABEL,
          relPath: "assets/vendor-x.js",
          bytes: 2048,
          gzipBytes: 512,
        },
      ],
    });

    const markdown = renderReport(head, undefined, 300 * 1024);
    expect(markdown).toContain("| Output | Size |");
    expect(markdown).not.toContain("Flagged Bundles");
    expect(markdown).toContain(VENDOR_LABEL);
  });

  it("renders a diff table and calls out flagged bundles", () => {
    const base = snapshot({
      outputs: [{ label: "Client bundle", path: "x", bytes: 1_000_000 }],
      totalBytes: 1_000_000,
      assetFiles: [
        {
          label: VENDOR_LABEL,
          relPath: "assets/vendor-a.js",
          bytes: 1_000_000,
          gzipBytes: 200_000,
        },
      ],
    });
    const head = snapshot({
      outputs: [
        { label: "Client bundle", path: "x", bytes: 1_000_000 + 400 * 1024 },
      ],
      totalBytes: 1_000_000 + 400 * 1024,
      assetFiles: [
        {
          label: VENDOR_LABEL,
          relPath: "assets/vendor-b.js",
          bytes: 1_000_000 + 400 * 1024,
          gzipBytes: 250_000,
        },
      ],
    });

    const markdown = renderReport(head, base, 300 * 1024);
    expect(markdown).toContain("| Output | Base | Head | Δ |");
    expect(markdown).toContain("Flagged Bundles");
    expect(markdown).toContain(`${VENDOR_LABEL}\`: `);
    expect(markdown).not.toContain("No bundles changed by more than");
  });

  it("reassures when nothing is flagged", () => {
    const base = snapshot({
      outputs: [{ label: "Client bundle", path: "x", bytes: 1_000_000 }],
      totalBytes: 1_000_000,
    });
    const head = snapshot({
      outputs: [{ label: "Client bundle", path: "x", bytes: 1_000_100 }],
      totalBytes: 1_000_100,
    });

    const markdown = renderReport(head, base, 300 * 1024);
    expect(markdown).toContain("No bundles changed by more than");
  });

  it("notes when the base branch build was unavailable", () => {
    const head = snapshot();
    const markdown = renderReport(head, undefined, 300 * 1024, {
      baseUnavailable: true,
    });
    expect(markdown).toContain("Base branch build unavailable");
  });

  it("always renders vendor/index rows for the client chunk labels", () => {
    expect(VENDOR_LABEL).toBe("assets/vendor.js");
    expect(INDEX_LABEL).toBe("assets/index.js");
  });
});
