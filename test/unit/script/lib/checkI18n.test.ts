import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkI18n,
  fixUnusedKeys,
  formatFindings,
  type I18nFinding,
} from "../../../../script/lib/checkI18n";

const FIXTURE = path.resolve(__dirname, "../../../fixtures/i18n-project");

function findings(rule: I18nFinding["rule"], all: I18nFinding[]) {
  return all.filter((f) => f.rule === rule);
}

describe("checkI18n", () => {
  const all = checkI18n(FIXTURE, { exemptKeys: new Set(["exempt-key"]) });

  it("reports an unused key in every locale file, at the key's line", () => {
    const unused = findings("translation-unused-keys", all);
    expect(unused.map((f) => [f.file, f.line])).toEqual([
      ["packages/seed-bible/seed-bible/i18n/de.json", 3],
      ["packages/seed-bible/seed-bible/i18n/en.json", 3],
    ]);
    expect(unused[0]?.message).toBe("Unused translation key: 'unused-key'.");
  });

  it("does not report exempt keys, used keys, or plural forms of a used key", () => {
    const keys = findings("translation-unused-keys", all).map((f) => f.message);
    // Quote-anchored so this doesn't false-positive on the legitimately
    // unused `unused-key`, which contains `used-key` as a substring.
    expect(keys.join("\n")).not.toMatch(/'exempt-key'|'used-key'|'plural-key/);
  });

  it("reports a locale missing an English key", () => {
    expect(findings("translation-incomplete-translations", all)).toEqual([
      {
        file: "packages/seed-bible/seed-bible/i18n/de.json",
        line: 1,
        rule: "translation-incomplete-translations",
        message: "Locale 'de' is missing key 'plural-key_other'",
      },
    ]);
  });

  it("reports an extension locale missing an English key, at the locale's line", () => {
    const extensionFindings = findings(
      "translation-extension-incomplete-translations",
      all
    ).filter((f) => f.file === "packages/demo-extension/extension.json");
    expect(extensionFindings).toEqual([
      {
        file: "packages/demo-extension/extension.json",
        line: 5,
        rule: "translation-extension-incomplete-translations",
        message: "Locale 'de' is missing key 'extra'",
      },
    ]);
  });

  it("reports an extension manifest with no English translations, at the 'translations' line", () => {
    const extensionFindings = findings(
      "translation-extension-incomplete-translations",
      all
    ).filter((f) => f.file === "packages/no-english-extension/extension.json");
    expect(extensionFindings).toEqual([
      {
        file: "packages/no-english-extension/extension.json",
        line: 3,
        rule: "translation-extension-incomplete-translations",
        message: "Missing 'en' translations in extension manifest.",
      },
    ]);
  });

  it("formats findings one per line, ESLint style", () => {
    const line = formatFindings(all.slice(0, 1));
    expect(line).toMatch(
      /^packages\/[^ ]+:\d+ {2}warning {2}.+ {2}translation-[a-z-]+$/m
    );
  });

  it("throws when the i18n directory is missing", () => {
    expect(() =>
      checkI18n(path.join(FIXTURE, "nowhere"), { exemptKeys: new Set() })
    ).toThrow(/i18n directory not found/);
  });
});

describe("fixUnusedKeys", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "i18n-fix-"));
    cpSync(FIXTURE, root, { recursive: true });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("removes exactly the unused keys from each locale file and keeps 2-space formatting", () => {
    const all = checkI18n(root, { exemptKeys: new Set(["exempt-key"]) });
    const rewritten = fixUnusedKeys(root, all);

    expect(rewritten.sort()).toEqual([
      "packages/seed-bible/seed-bible/i18n/de.json",
      "packages/seed-bible/seed-bible/i18n/en.json",
    ]);
    const en = readFileSync(
      path.join(root, "packages/seed-bible/seed-bible/i18n/en.json"),
      "utf8"
    );
    expect(en).toBe(
      '{\n  "used-key": "Used",\n  "exempt-key": "Exempt",\n  "plural-key_one": "One",\n  "plural-key_other": "Many"\n}\n'
    );
    expect(
      checkI18n(root, { exemptKeys: new Set(["exempt-key"]) }).filter(
        (f) => f.rule === "translation-unused-keys"
      )
    ).toEqual([]);
  });

  it("leaves files untouched when there is nothing to fix", () => {
    expect(fixUnusedKeys(root, [])).toEqual([]);
  });
});
