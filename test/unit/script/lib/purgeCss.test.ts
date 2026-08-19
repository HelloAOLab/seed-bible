import { describe, expect, it } from "vitest";
import {
  derivePrefixSafelist,
  formatPurgeSavings,
  purgeCssFiles,
} from "../../../../script/lib/purgeCss";

async function purge(css: string, content: string[]): Promise<string> {
  const result = await purgeCssFiles([{ name: "test.css", css }], content);
  return result.get("test.css") ?? "";
}

describe("purgeCssFiles", () => {
  it("removes rules whose classes appear nowhere in the content", async () => {
    const css = `.sb-used { color: red } .sb-unused { color: blue }`;

    const purged = await purge(css, [`<div class="sb-used"></div>`]);

    expect(purged).toContain(".sb-used");
    expect(purged).not.toContain(".sb-unused");
  });

  it("keeps every rule that is actually referenced", async () => {
    const css = `.a { color: red } #b { color: blue } [data-c] { color: teal }`;

    const purged = await purge(css, [`class="a" id="b" data-c="1"`]);

    expect(purged).toContain(".a");
    expect(purged).toContain("#b");
    expect(purged).toContain("[data-c]");
  });

  describe("theming", () => {
    it("keeps the :root custom properties even with no content at all", async () => {
      const css = `:root { --sb-primary-color: #e8623a; --sb-font-color: #333 }`;

      const purged = await purge(css, [""]);

      expect(purged).toContain("--sb-primary-color");
      expect(purged).toContain("--sb-font-color");
    });

    it("keeps a custom property that only a runtime-injected theme reads", async () => {
      // ThemeManager writes `.sb-highlight-<id> { color: var(--sb-highlight-
      // <id>-font-color) }` into a <style> tag at runtime, so nothing in the
      // build's content ever mentions the variable.
      const css = `:root { --sb-highlight-yellow-font-color: #333 }`;

      const purged = await purge(css, [`<div class="unrelated"></div>`]);

      expect(purged).toContain("--sb-highlight-yellow-font-color");
    });

    it("keeps theme editor classes that no scanned file mentions", async () => {
      const css = `.sb-theme-color-row .sb-theme-color-input { width: 2rem }
        .sb-settings-theme-button-selected { border: 1px solid }`;

      const purged = await purge(css, [`<div class="unrelated"></div>`]);

      expect(purged).toContain(".sb-theme-color-input");
      expect(purged).toContain(".sb-settings-theme-button-selected");
    });

    it("keeps @font-face and @keyframes that nothing statically references", async () => {
      const css = `@font-face { font-family: "Material Symbols Outlined"; src: url(x.woff2) }
        @keyframes sb-ribbon-enter { from { opacity: 0 } }`;

      const purged = await purge(css, [`<div class="unrelated"></div>`]);

      expect(purged).toContain("@font-face");
      expect(purged).toContain("@keyframes sb-ribbon-enter");
    });
  });

  describe("highlights", () => {
    it("keeps highlight rules the reader only builds at runtime", async () => {
      const css = `.sb-highlight-layer { position: absolute }
        .sb-highlight-ribbon-broadcast { stroke-width: 2px }
        .sb-highlight-preview-pill { border-radius: 1rem }
        .sidebar-chapter-itm.un-highlight { opacity: .5 }`;

      const purged = await purge(css, [`<div class="unrelated"></div>`]);

      expect(purged).toContain(".sb-highlight-layer");
      expect(purged).toContain(".sb-highlight-ribbon-broadcast");
      expect(purged).toContain(".sb-highlight-preview-pill");
      expect(purged).toContain(".un-highlight");
    });

    it("keeps per-colour highlight classes assembled from a colour id", async () => {
      const css = `.sb-highlight-yellow { color: #333 } .sb-highlight-cyan { color: #333 }`;

      const purged = await purge(css, ["`sb-highlight-${highlight.colorId}`"]);

      expect(purged).toContain(".sb-highlight-yellow");
      expect(purged).toContain(".sb-highlight-cyan");
    });
  });

  describe("runtime-assembled class names", () => {
    it("keeps classes built from a template literal prefix", async () => {
      const css = `.sb-extension-state-installed { color: green }
        .sb-extension-state-failed { color: red }`;

      const purged = await purge(css, [
        "`material-symbols-outlined sb-extension-state-${installState}`",
      ]);

      expect(purged).toContain(".sb-extension-state-installed");
      expect(purged).toContain(".sb-extension-state-failed");
    });

    it("still removes unrelated classes that share no such prefix", async () => {
      const css = `.sb-extension-state-installed { color: green }
        .sb-extension-gone { color: grey }`;

      const purged = await purge(css, ["`sb-extension-state-${installState}`"]);

      expect(purged).toContain(".sb-extension-state-installed");
      expect(purged).not.toContain(".sb-extension-gone");
    });
  });

  describe("nested rules", () => {
    it("keeps a nested `&` block whose parent is used", async () => {
      const css = `.sb-verse { color: red; &:has(.sb-verse-decoration-diminish) { opacity: .5 } }`;

      const purged = await purge(css, [
        '<span class="sb-verse sb-verse-decoration-diminish">',
      ]);

      expect(purged).toContain("&:has(.sb-verse-decoration-diminish)");
    });

    it("still removes a nested rule that names an unused class", async () => {
      const css = `.sb-verse { color: red; & .sb-gone { color: blue } }`;

      const purged = await purge(css, ['<span class="sb-verse">']);

      expect(purged).toContain(".sb-verse");
      expect(purged).not.toContain(".sb-gone");
    });
  });

  it("purges several stylesheets in one pass, keyed by name", async () => {
    const result = await purgeCssFiles(
      [
        { name: "a.css", css: ".used-a {color:red} .gone-a {color:red}" },
        { name: "b.css", css: ".used-b {color:red} .gone-b {color:red}" },
      ],
      [`class="used-a used-b"`]
    );

    expect(result.get("a.css")).toContain(".used-a");
    expect(result.get("a.css")).not.toContain(".gone-a");
    expect(result.get("b.css")).toContain(".used-b");
    expect(result.get("b.css")).not.toContain(".gone-b");
  });

  it("returns nothing for no input", async () => {
    expect(await purgeCssFiles([], ["anything"])).toEqual(new Map());
  });
});

/** The single alternation {@link derivePrefixSafelist} builds, asserted present. */
function prefixPattern(content: string[]): RegExp {
  const [pattern] = derivePrefixSafelist(content);
  if (!pattern) throw new Error("no prefix pattern was derived");
  return pattern;
}

describe("derivePrefixSafelist", () => {
  it("matches every class built from a hyphen-terminated token", () => {
    const pattern = prefixPattern(["`sb-tab-user-role-${role}`"]);

    expect(pattern.test("sb-tab-user-role-host")).toBe(true);
    expect(pattern.test("sb-tab-user-role-cohost")).toBe(true);
    expect(pattern.test("sb-tab-title")).toBe(false);
  });

  it("ignores prefixes too broad to be useful", () => {
    // `sb-` would safelist essentially every class in the app.
    expect(derivePrefixSafelist(["`sb-${id}`"])).toEqual([]);
    // Runs of hyphens from ASCII art or `--` flags can't start a class name.
    expect(derivePrefixSafelist(["/* ---------- */"])).toEqual([]);
  });

  it("returns no pattern when the content has no dynamic prefixes", () => {
    expect(derivePrefixSafelist(['class="plain"'])).toEqual([]);
  });

  it("treats regex metacharacters in a token literally", () => {
    // BEM-style `--` modifiers reach the safelist as `ts_btn--`.
    const pattern = prefixPattern(["`ts_btn--${size}`"]);

    expect(pattern.test("ts_btn--sm")).toBe(true);
  });
});

describe("formatPurgeSavings", () => {
  it("reports the reduction as a percentage", () => {
    expect(formatPurgeSavings(2048, 1024)).toBe(
      "2.0 kB -> 1.0 kB (50% smaller)"
    );
  });

  it("does not divide by zero on empty input", () => {
    expect(formatPurgeSavings(0, 0)).toBe("0.0 kB -> 0.0 kB (0% smaller)");
  });
});
