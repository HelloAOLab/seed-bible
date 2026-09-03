import type { DomainEventPort } from "../ports/in/eventBus";
import type { ThemeStatePort } from "../ports/in/ThemeState";

interface ServiceParams {
  eventBus: DomainEventPort;
}

/**
 * The pattern runs in a cross-origin iframe, so it cannot inherit the reader's
 * `--sb-*` variables. The host composes its active theme and pushes the text
 * over the bridge; this holds it until then the stylesheet's own fallbacks apply.
 */
export class ThemeStateService implements ThemeStatePort {
  #eventBus: ServiceParams["eventBus"];
  #css = "";

  constructor({ eventBus }: ServiceParams) {
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
