import { RuleTester } from "vite-plus/lint/plugins-dev";
import noImmediateStorageAccessRule from "../../../../script/lint/noImmediateStorageAccessRule.ts";

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

// RuleTester looks for global `describe`/`it` by default; wiring vitest's in
// explicitly avoids relying on that detection.
RuleTester.describe = describe;
RuleTester.it = it;

ruleTester.run("no-immediate-storage-access", noImmediateStorageAccessRule, {
  valid: [
    {
      name: "a hydrate*-named function defined in a factory, but not called there",
      code: `
        function createLoginManager() {
          const hydrateLocalConfig = () => {
            return localStorage.getItem("config");
          };
          return { hydrateLocalConfig };
        }
      `,
    },
    {
      name: "a bare effect() callback inside a factory body",
      code: `
        function createTheme() {
          effect(() => {
            const raw = localStorage.getItem("theme");
          });
        }
      `,
    },
    {
      name: "a useEffect() callback inside a component body",
      code: `
        function BibleReaderToolbar() {
          useEffect(() => {
            const raw = localStorage.getItem("toolbar");
          }, []);
        }
      `,
    },
    {
      name: "a lowercase, non-create-prefixed module-scope helper (mirrors readCachedProfile)",
      code: `
        function readCachedProfile(userId) {
          if (typeof localStorage === "undefined") {
            return null;
          }
          return localStorage.getItem("profile-" + userId);
        }
      `,
    },
    {
      name: "a bare typeof guard with no further member access",
      code: `
        function createLoginManager() {
          if (typeof localStorage !== "undefined") {
            doSomething();
          }
        }
      `,
    },
  ],
  invalid: [
    {
      name: "localStorage read directly in a create*-named factory body (the real LoginManager shape)",
      code: `
        function createLoginManager() {
          if (typeof localStorage !== "undefined") {
            const storedSessionKey = localStorage.getItem("sessionKey");
          }
        }
      `,
      errors: [{ messageId: "immediateStorageAccess" }],
    },
    {
      name: "indexedDB.open directly in a create*-named factory body",
      code: `
        function createIndexedDbTranslationStore() {
          const request = indexedDB.open("translations");
        }
      `,
      errors: [{ messageId: "immediateStorageAccess" }],
    },
    {
      name: "localStorage read directly in a PascalCase component body",
      code: `
        function BibleReaderToolbar() {
          const raw = localStorage.getItem("toolbar");
          return raw;
        }
      `,
      errors: [{ messageId: "immediateStorageAccess" }],
    },
    {
      name: "raw module top-level access, no enclosing function at all",
      code: `const cached = localStorage.getItem("cached");`,
      errors: [{ messageId: "immediateStorageAccess" }],
    },
    {
      name: "window.localStorage-prefixed access",
      code: `
        function createTheme() {
          const raw = window.localStorage.getItem("theme");
        }
      `,
      errors: [{ messageId: "immediateStorageAccess" }],
    },
    {
      name: "globalThis.localStorage-prefixed access",
      code: `
        function createTheme() {
          const raw = globalThis.localStorage.getItem("theme");
        }
      `,
      errors: [{ messageId: "immediateStorageAccess" }],
    },
  ],
});
