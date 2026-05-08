import * as appHooks from "preact/hooks";
import { render } from "preact";

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!globalThis.os) {
  globalThis.os = {};
}

globalThis.os.appHooks = {
  ...appHooks,
  render,
};
