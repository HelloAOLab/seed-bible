import { defaultArrangement } from "./defaultArrangement";
import type { ArrangementInfoConfig } from "../../models/arrangement";

/**
 * Provides the bundled default scripture arrangement (the first static
 * arrangement). It lives inside the pattern instead of being sent through the
 * config-bot tags because the arrangement is large and, combined with the book
 * names, overflowed the iframe URL's size limit. The book names stay dynamic
 * (passed via the URL); only the arrangement structure is fixed here.
 */
export class ArrangementConfigProvider {
  getDefaultArrangement(): ArrangementInfoConfig {
    return defaultArrangement;
  }
}
