import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/HelloAOLab/seed-bible/eslint-rules/${name}`
);

type MessageIds = "immediateStorageAccess";
type Options = [];

type StorageApiName = "localStorage" | "indexedDB";

function getIdentifierStorageApiName(
  node: TSESTree.Node
): StorageApiName | null {
  if (node.type !== "Identifier") {
    return null;
  }
  return node.name === "localStorage" || node.name === "indexedDB"
    ? node.name
    : null;
}

/**
 * Resolves `localStorage`/`indexedDB`, optionally prefixed with
 * `window.`/`globalThis.`, to which storage API it refers to. Deliberately
 * does not match a bare `typeof localStorage` check (there's no
 * MemberExpression there), so the codebase's ubiquitous
 * `typeof localStorage !== "undefined"` SSR guard never trips this rule.
 */
function getStorageApiName(node: TSESTree.Node): StorageApiName | null {
  const direct = getIdentifierStorageApiName(node);
  if (direct) {
    return direct;
  }

  if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "Identifier" &&
    (node.object.name === "window" || node.object.name === "globalThis")
  ) {
    return getIdentifierStorageApiName(node.property);
  }

  return null;
}

type NamedFunction =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

function isFunctionNode(node: TSESTree.Node): node is NamedFunction {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

function findEnclosingFunction(node: TSESTree.Node): NamedFunction | null {
  let current: TSESTree.Node | undefined = node.parent ?? undefined;
  while (current) {
    if (isFunctionNode(current)) {
      return current;
    }
    current = current.parent ?? undefined;
  }
  return null;
}

/**
 * The name a reader would use to refer to this function: its own name for a
 * `function foo() {}` declaration, or the variable it's assigned to for
 * `const foo = () => {}` / `const foo = function () {}`. Null for anything
 * else (an anonymous callback) — those are always nested at least one
 * function deeper than the manager/component body this rule cares about, so
 * they're never the boundary being classified.
 */
function getFunctionName(node: NamedFunction): string | null {
  if (node.type === "FunctionDeclaration" && node.id) {
    return node.id.name;
  }

  const parent = node.parent;
  if (
    parent?.type === "VariableDeclarator" &&
    parent.id.type === "Identifier"
  ) {
    return parent.id.name;
  }

  return null;
}

const MANAGER_FACTORY_NAME = /^create[A-Z]/;
const COMPONENT_NAME = /^[A-Z]/;

/**
 * A "risky boundary" is a manager factory (`createFoo`) or component
 * (`Foo`) declared directly at module scope — the function whose body runs
 * synchronously during construction/render, on both the server and the
 * client, before any post-mount effect gets a chance to correct a
 * server/client mismatch. Everything else (a `hydrate*`/`read*`/`write*`
 * helper, an `effect()`/`useEffect()` callback, an event handler) only runs
 * once something else calls it later, so a storage read inside it is safe.
 */
function isRiskyBoundary(fn: NamedFunction): boolean {
  if (findEnclosingFunction(fn)) {
    return false;
  }

  const name = getFunctionName(fn);
  if (!name) {
    return false;
  }

  return MANAGER_FACTORY_NAME.test(name) || COMPONENT_NAME.test(name);
}

function describeBoundary(fn: NamedFunction | null): string {
  if (!fn) {
    return "module scope";
  }
  return getFunctionName(fn) ?? "this function";
}

const noImmediateStorageAccessRule = createRule<Options, MessageIds>({
  name: "no-immediate-storage-access",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallows reading/writing localStorage or indexedDB directly in a manager factory's or component's body, since that body also runs during SSR and an eager read there can make the client's first render disagree with the server's. Defer the real read to a hydrate*() function invoked from a post-mount effect, or move it inside an existing effect/handler.",
    },
    schema: [],
    messages: {
      immediateStorageAccess:
        "Don't use `{{api}}` directly in {{boundary}}'s body — this also runs during SSR and can cause a hydration mismatch. Seed the signal to match SSR (empty/null) and apply the real value from a `hydrate*()` function called in a post-mount effect, or move this inside an existing effect/handler.",
    },
  },
  defaultOptions: [],

  create(context) {
    return {
      MemberExpression(node: TSESTree.MemberExpression): void {
        const api = getStorageApiName(node.object);
        if (!api) {
          return;
        }

        const enclosingFunction = findEnclosingFunction(node);
        const risky = !enclosingFunction || isRiskyBoundary(enclosingFunction);

        if (!risky) {
          return;
        }

        context.report({
          node,
          messageId: "immediateStorageAccess",
          data: {
            api,
            boundary: describeBoundary(enclosingFunction),
          },
        });
      },
    };
  },
});

export default noImmediateStorageAccessRule;
