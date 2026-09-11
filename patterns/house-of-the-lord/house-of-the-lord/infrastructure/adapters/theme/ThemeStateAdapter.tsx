import type { InfrastructureEventPort } from "../../models/events";

interface AdapterParams {
  eventBus: InfrastructureEventPort;
}

/**
 * The pattern runs in a cross-origin iframe, so it cannot inherit the reader's
 * `--sb-*` variables. The host composes its active theme and pushes the text
 * over the bridge; until then the stylesheet's own fallbacks apply.
 */
export class ThemeStateAdapter {
  #eventBus: AdapterParams["eventBus"];
  #css = "";

  constructor({ eventBus }: AdapterParams) {
    this.#eventBus = eventBus;
  }

  getCss(): string {
    return this.#css;
  }

  setCss(css: string): void {
    if (css === this.#css) return;
    this.#css = css;
    this.#eventBus.emit("OnThemeChanged", { css });
  }
}
