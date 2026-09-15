import { RuleTester } from "vite-plus/lint/plugins-dev";
import i18nUntranslatedContentRule from "../../../../script/lint/i18nUntranslatedContentRule.ts";

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

// RuleTester looks for global `describe`/`it` by default; wiring vitest's in
// explicitly avoids relying on that detection.
RuleTester.describe = describe;
RuleTester.it = it;

// `ESLintUtils.RuleCreator`'s rule type and oxlint's `Rule` disagree nominally
// (see `script/lint/i18nPlugin.ts`) but not at runtime.
ruleTester.run(
  "i18n-untranslated-content",
  i18nUntranslatedContentRule as never,
  {
    valid: [
      {
        // Oxlint reports `JSXText.value` as written, so without decoding the rule
        // sees the literal `&#x2022;` and the `x` trips its letter test.
        name: "JSX text that is only an HTML character reference",
        code: `const a = <span>&#x2022;</span>;`,
      },
      {
        name: "an HTML character reference surrounded by whitespace and punctuation",
        code: `const a = <span> &#x2022; — &#8212; </span>;`,
      },
      {
        name: "a named HTML character reference that decodes to no letters",
        code: `const a = <span>&nbsp;&amp;&hellip;</span>;`,
      },
      {
        name: "JSX text with no alphabetic content at all",
        code: `const a = <span>1234 · 56</span>;`,
      },
      {
        name: "a non-translatable attribute holding plain text",
        code: `const a = <span className="Hello" />;`,
      },
    ],
    invalid: [
      {
        name: "plain untranslated JSX text",
        code: `const a = <span>Hello</span>;`,
        errors: [{ messageId: "untranslated_content" }],
      },
      {
        // Guards the decoding from swallowing real text that merely contains an
        // entity: the decoded string still has letters, so it must still report.
        name: "JSX text mixing an HTML character reference with real words",
        code: `const a = <span>&#x2022; Hello</span>;`,
        errors: [{ messageId: "untranslated_content" }],
      },
      {
        name: "an untranslated title attribute",
        code: `const a = <span title="Hello" />;`,
        errors: [{ messageId: "untranslated_attribute" }],
      },
      {
        name: "an untranslated aria-label attribute",
        code: `const a = <span aria-label="Close menu" />;`,
        errors: [{ messageId: "untranslated_attribute" }],
      },
    ],
  }
);
