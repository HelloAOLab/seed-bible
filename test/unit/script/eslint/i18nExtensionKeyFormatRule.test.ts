import { RuleTester, type ESLint, type Rule } from "eslint";
import json from "@eslint/json";
import i18nExtensionKeyFormatRule from "../../../../script/eslint/i18nExtensionKeyFormatRule";

// See `noImmediateStorageAccessRule.test.ts` for why the cast.
const rule = i18nExtensionKeyFormatRule as unknown as Rule.RuleModule;

const ruleTester = new RuleTester({
  // `@eslint/json`'s plugin type and eslint's differ in name only, as in
  // `eslint.config.mts`.
  plugins: { json: json as unknown as ESLint.Plugin },
  language: "json/json",
});

RuleTester.describe = describe;
RuleTester.it = it;

const manifest = (translations: Record<string, Record<string, string>>) =>
  JSON.stringify({ id: "verse-art", translations }, null, 2);

ruleTester.run("translation-extension-key-format", rule, {
  valid: [
    {
      name: "keys with dashes, dots and plural forms",
      code: manifest({
        en: {
          title: "Verse Art",
          "setting-style-title": "Style",
          "menu.open": "Open",
          verses_one: "{{count}} verse",
          verses_other: "{{count}} verses",
        },
      }),
    },
    {
      name: "a colon in a string, not its key",
      code: manifest({ en: { time: "Time: {{value}}" } }),
    },
  ],
  invalid: [
    {
      name: "a colon in an English key",
      code: manifest({ en: { title: "Verse Art", "time:label": "Time" } }),
      errors: [{ messageId: "colon_in_key", data: { key: "time:label" } }],
    },
    {
      name: "a colon in another language's key",
      code: manifest({
        en: { title: "Verse Art" },
        es: { title: "Arte", "a:b": "x" },
      }),
      errors: [{ messageId: "colon_in_key", data: { key: "a:b" } }],
    },
  ],
});
