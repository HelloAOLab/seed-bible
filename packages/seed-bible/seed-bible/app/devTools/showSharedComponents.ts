import { options, type VNode } from "preact";
import * as sharedComponents from "../../components";
import * as icons from "../../components/icons";

// Outlines every shared component (the ones exported from
// `components/index.tsx`) so hand-built look-alikes stand out while testing.

const ATTRIBUTE = "data-sb-component";
// Adds behavior to an element it's given rather than drawing its own, so
// outlining it would mark whatever it wraps as shared.
const SKIPPED = new Set(["TooltipTrigger"]);

// Preact's mangled internal names: a vnode's DOM node, children and component
// instance. `v` is preact/compat's name for a portal's fake container, whose
// `childNodes` are the elements the portal drew into its target.
type InternalVNode = VNode & {
  __e?: Node | null;
  __k?: (InternalVNode | null)[] | null;
  __c?: { v?: { childNodes?: Node[] } | null } | null;
};

// The top-level elements a component drew, looking through fragments and
// portals (Dialog and BottomSheet draw into `document.body`).
function rootElements(vnode: InternalVNode): Element[] {
  const portalNodes = vnode.__c?.v?.childNodes;
  if (portalNodes) {
    return portalNodes.filter(
      (node): node is Element => node instanceof Element
    );
  }
  if (typeof vnode.type === "string") {
    return vnode.__e instanceof Element ? [vnode.__e] : [];
  }
  return (vnode.__k ?? []).flatMap((child) =>
    child ? rootElements(child) : []
  );
}

// A full-screen backdrop isn't the component people see; outline what it
// holds instead (Dialog's box sits inside its backdrop; BottomSheet's empty
// backdrop is a sibling of the sheet, so it's dropped).
function outlineTarget(el: Element): Element | null {
  const isBackdrop = [...el.classList].some((c) => c.endsWith("-backdrop"));
  return isBackdrop ? el.firstElementChild : el;
}

function collectSharedComponents(): Map<unknown, string> {
  const iconExports = new Set<unknown>(Object.values(icons));
  const names = new Map<unknown, string>();
  for (const [name, value] of Object.entries(sharedComponents)) {
    if (
      typeof value === "function" &&
      /^[A-Z]/.test(name) &&
      !SKIPPED.has(name) &&
      !iconExports.has(value)
    ) {
      names.set(value, name);
    }
  }
  return names;
}

function tag(vnode: InternalVNode, names: Map<unknown, string>) {
  const name = names.get(vnode.type);
  if (!name) return;
  for (const root of rootElements(vnode)) {
    const el = outlineTarget(root);
    if (!el) continue;
    // When one shared component's root is another's (CloseButton renders an
    // IconButton), Preact finishes the inner one first, so prepending keeps
    // the list outermost-first.
    const existing = el.getAttribute(ATTRIBUTE)?.split(" ") ?? [];
    if (!existing.includes(name)) {
      el.setAttribute(ATTRIBUTE, [name, ...existing].join(" "));
    }
  }
}

// Catches whatever rendered before this module loaded.
function tagExistingTree(names: Map<unknown, string>) {
  const visit = (vnode: InternalVNode | null | undefined) => {
    if (!vnode) return;
    vnode.__k?.forEach(visit);
    tag(vnode, names);
  };
  for (const el of document.querySelectorAll("*")) {
    const root = (el as Element & { __k?: InternalVNode }).__k;
    if (root) visit(root);
  }
}

const STYLES = `
[${ATTRIBUTE}] {
  outline: 2px solid #22c55e !important;
  outline-offset: -2px !important;
}
#sb-dev-component-label {
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
  padding: 2px 6px;
  border-radius: 4px;
  background: #166534;
  color: #fff;
  font: 600 11px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: nowrap;
}
`;

function showLabelsOnHover(): () => void {
  const label = document.createElement("div");
  label.id = "sb-dev-component-label";
  label.hidden = true;
  document.body.appendChild(label);

  const onMouseOver = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest?.(
      `[${ATTRIBUTE}]`
    );
    if (!target) {
      label.hidden = true;
      return;
    }
    label.textContent = target.getAttribute(ATTRIBUTE)!.split(" ").join(" › ");
    label.hidden = false;
    const rect = target.getBoundingClientRect();
    const labelHeight = label.offsetHeight;
    const top =
      rect.top - labelHeight - 2 >= 0
        ? rect.top - labelHeight - 2
        : rect.bottom + 2;
    label.style.top = `${top}px`;
    label.style.left = `${Math.max(0, rect.left)}px`;
  };
  const onScroll = () => (label.hidden = true);
  document.addEventListener("mouseover", onMouseOver);
  document.addEventListener("scroll", onScroll, true);

  return () => {
    document.removeEventListener("mouseover", onMouseOver);
    document.removeEventListener("scroll", onScroll, true);
    label.remove();
  };
}

let names: Map<unknown, string> | null = null;
let active = false;
let removeStyle: (() => void) | null = null;
let removeLabels: (() => void) | null = null;

export function startShowSharedComponents() {
  if (active) return;
  active = true;

  if (!names) {
    names = collectSharedComponents();
    const known = names;
    // Hooked once and left in place: unhooking could drop a hook something
    // else (preact/debug, signals) added after this one.
    const previousDiffed = options.diffed;
    options.diffed = (vnode) => {
      if (active) tag(vnode as InternalVNode, known);
      previousDiffed?.(vnode);
    };
  }
  tagExistingTree(names);

  const style = document.createElement("style");
  style.textContent = STYLES;
  document.head.appendChild(style);
  removeStyle = () => style.remove();
  removeLabels = showLabelsOnHover();
}

export function stopShowSharedComponents() {
  if (!active) return;
  active = false;
  removeStyle?.();
  removeLabels?.();
  for (const el of document.querySelectorAll(`[${ATTRIBUTE}]`)) {
    el.removeAttribute(ATTRIBUTE);
  }
}
