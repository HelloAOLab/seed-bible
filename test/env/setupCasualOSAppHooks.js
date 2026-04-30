import * as appHooks from "preact/hooks";
import { render } from "preact";

if (!globalThis.os) {
  globalThis.os = {};
}

globalThis.os.appHooks = {
  ...appHooks,
  render,
};
