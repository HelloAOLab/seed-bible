import type { VerseRange } from "../../domain/models/scripture";
import type { ScriptureNavigationPort } from "../ports/in/ScriptureNavigation";
import type { ScriptureNavigationAdapterPort } from "../ports/out/ScriptureNavigationAdapter";

interface ServiceParams {
  scriptureNavigationAdapterPort: ScriptureNavigationAdapterPort;
}

export class ScriptureNavigationService implements ScriptureNavigationPort {
  #scriptureNavigationAdapterPort: ServiceParams["scriptureNavigationAdapterPort"];

  constructor({ scriptureNavigationAdapterPort }: ServiceParams) {
    this.#scriptureNavigationAdapterPort = scriptureNavigationAdapterPort;
  }

  navigate(range: VerseRange): void {
    this.#scriptureNavigationAdapterPort.navigate(range);
  }
}
