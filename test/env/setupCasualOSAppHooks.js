import * as appHooks from "preact/hooks";
import { render, createContext } from "preact";

if (!globalThis.os) {
  globalThis.os = {};
}

globalThis.os.appHooks = {
  ...appHooks,
  render,
  createContext,
};

globalThis.os.appCompat = {
  // memo: identity in tests — components are mocked at the module level anyway
  memo: (component) => component,
  // forwardRef: expose ref as second argument, matching Preact/compat semantics
  forwardRef: (component) => (props) => component(props, props.ref),
  // createPortal: render inline in tests — avoids needing preact/compat (side effects)
  createPortal: (vnode) => vnode,
};
