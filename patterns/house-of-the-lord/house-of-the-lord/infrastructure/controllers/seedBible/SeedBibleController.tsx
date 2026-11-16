import type { ThemeStateAdapter } from "../../adapters/theme/ThemeStateAdapter";

interface ControllerParams {
  themeStateAdapter: ThemeStateAdapter;
}

export class SeedBibleController {
  #themeStateAdapter: ControllerParams["themeStateAdapter"];

  constructor({ themeStateAdapter }: ControllerParams) {
    this.#themeStateAdapter = themeStateAdapter;
  }

  handleThemeChanged(css: string) {
    if (!css) {
      console.warn(
        "house-of-the-lord SeedBibleController: theme changed without css",
        { css }
      );
      return;
    }

    this.#themeStateAdapter.setCss(css);
  }
}
