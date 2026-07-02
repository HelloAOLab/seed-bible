import { LAYOUTS, type LayoutConfigurations } from "./layouts";

export class BookSetupConfigProvider {
  getLayout(config: LayoutConfigurations) {
    return LAYOUTS[config];
  }
}
