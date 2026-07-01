import { mergeI18nJson } from "../../../../script/lib/mergeI18nJson";

/** Parses the merged text back into an object (only valid when clean). */
function parsed(text: string) {
  return JSON.parse(text);
}

describe("mergeI18nJson", () => {
  describe("auto-resolvable merges", () => {
    it("keeps both keys when each side adds a different key", () => {
      const base = { shared: "Shared" };
      const ours = { shared: "Shared", local: "Local" };
      const theirs = { shared: "Shared", remote: "Remote" };

      const result = mergeI18nJson(base, ours, theirs);

      expect(result.hasConflict).toBe(false);
      expect(parsed(result.text)).toEqual({
        shared: "Shared",
        local: "Local",
        remote: "Remote",
      });
    });

    it("deletes a key removed on both sides", () => {
      const base = { keep: "Keep", drop: "Drop" };
      const ours = { keep: "Keep" };
      const theirs = { keep: "Keep" };

      const result = mergeI18nJson(base, ours, theirs);

      expect(result.hasConflict).toBe(false);
      expect(parsed(result.text)).toEqual({ keep: "Keep" });
    });

    it("adds a key added identically on both sides", () => {
      const base = {};
      const ours = { greeting: "Hello" };
      const theirs = { greeting: "Hello" };

      const result = mergeI18nJson(base, ours, theirs);

      expect(result.hasConflict).toBe(false);
      expect(parsed(result.text)).toEqual({ greeting: "Hello" });
    });

    it("takes the changed side when only one side edits a key", () => {
      const base = { title: "Old" };
      const oursChanged = mergeI18nJson(
        base,
        { title: "New" },
        { title: "Old" }
      );
      const theirsChanged = mergeI18nJson(
        base,
        { title: "Old" },
        { title: "New" }
      );

      expect(oursChanged.hasConflict).toBe(false);
      expect(parsed(oursChanged.text)).toEqual({ title: "New" });
      expect(theirsChanged.hasConflict).toBe(false);
      expect(parsed(theirsChanged.text)).toEqual({ title: "New" });
    });

    it("is a no-op when neither side changed", () => {
      const base = { a: "1", b: "2" };

      const result = mergeI18nJson(base, { ...base }, { ...base });

      expect(result.hasConflict).toBe(false);
      expect(parsed(result.text)).toEqual(base);
    });

    it("treats a missing/empty base as {} (add/add with no ancestor)", () => {
      const result = mergeI18nJson({}, { a: "1" }, { b: "2" });

      expect(result.hasConflict).toBe(false);
      expect(parsed(result.text)).toEqual({ a: "1", b: "2" });
    });

    it("auto-merges independent edits to different nested keys", () => {
      const base = { group: { a: "1", b: "2" } };
      const ours = { group: { a: "ONE", b: "2" } };
      const theirs = { group: { a: "1", b: "TWO" } };

      const result = mergeI18nJson(base, ours, theirs);

      expect(result.hasConflict).toBe(false);
      expect(parsed(result.text)).toEqual({ group: { a: "ONE", b: "TWO" } });
    });
  });

  describe("conflicts", () => {
    it("conflicts when both sides add the same key with different values", () => {
      const result = mergeI18nJson(
        {},
        { greeting: "Hello" },
        { greeting: "Hi" }
      );

      expect(result.hasConflict).toBe(true);
      expect(result.text).toContain("<<<<<<<");
      expect(result.text).toContain("=======");
      expect(result.text).toContain(">>>>>>>");
      expect(result.text).toContain('"greeting": "Hello"');
      expect(result.text).toContain('"greeting": "Hi"');
    });

    it("conflicts when one side updates a key the other deletes", () => {
      const base = { title: "Old" };
      const updateVsDelete = mergeI18nJson(base, { title: "New" }, {});
      const deleteVsUpdate = mergeI18nJson(base, {}, { title: "New" });

      expect(updateVsDelete.hasConflict).toBe(true);
      expect(updateVsDelete.text).toContain('"title": "New"');
      expect(deleteVsUpdate.hasConflict).toBe(true);
      expect(deleteVsUpdate.text).toContain('"title": "New"');
    });

    it("conflicts when both sides edit the same key differently", () => {
      const result = mergeI18nJson(
        { title: "Old" },
        { title: "Ours" },
        { title: "Theirs" }
      );

      expect(result.hasConflict).toBe(true);
      expect(result.text).toContain('"title": "Ours"');
      expect(result.text).toContain('"title": "Theirs"');
    });

    it("still auto-resolves the non-conflicting keys around a conflict", () => {
      const base = { a: "1", title: "Old", b: "2" };
      const ours = { a: "1", title: "Ours", b: "2", local: "L" };
      const theirs = { a: "1", title: "Theirs", b: "2", remote: "R" };

      const result = mergeI18nJson(base, ours, theirs);

      expect(result.hasConflict).toBe(true);
      // Non-conflicting additions from both sides are present.
      expect(result.text).toContain('"local": "L"');
      expect(result.text).toContain('"remote": "R"');
    });
  });

  describe("formatting", () => {
    it("uses 2-space indentation and a trailing newline", () => {
      const result = mergeI18nJson({}, { a: "1" }, { b: "2" });

      expect(result.text.endsWith("\n")).toBe(true);
      expect(result.text).toBe('{\n  "a": "1",\n  "b": "2"\n}\n');
    });
  });
});
