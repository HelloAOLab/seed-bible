import type { NavMenuStatePort } from "../../../application/ports/in/NavMenuState";
import type { PieceFocusPort } from "../../../application/ports/in/PieceFocus";
import type { ScriptureNavigationPort } from "../../../application/ports/in/ScriptureNavigation";
import type { PieceKey } from "../../../domain/models/piece";
import type { VerseRange } from "../../../domain/models/scripture";

interface ControllerParams {
  navMenuStatePort: NavMenuStatePort;
  pieceFocusPort: PieceFocusPort;
  scriptureNavigationPort: ScriptureNavigationPort;
}

export class NavMenuController {
  #navMenuStatePort: ControllerParams["navMenuStatePort"];
  #pieceFocusPort: ControllerParams["pieceFocusPort"];
  #scriptureNavigationPort: ControllerParams["scriptureNavigationPort"];

  constructor({
    navMenuStatePort,
    pieceFocusPort,
    scriptureNavigationPort,
  }: ControllerParams) {
    this.#navMenuStatePort = navMenuStatePort;
    this.#pieceFocusPort = pieceFocusPort;
    this.#scriptureNavigationPort = scriptureNavigationPort;
  }

  handleToggle(): void {
    this.#navMenuStatePort.toggle();
  }

  handleClose(): void {
    this.#navMenuStatePort.close();
  }

  handleShowPieceList(): void {
    this.#navMenuStatePort.showPieceList();
  }

  handlePieceClick(key: PieceKey): void {
    this.#pieceFocusPort.focus(key);
  }

  handleShowEverything(): void {
    this.#pieceFocusPort.clearFocus();
  }

  handlePassageClick(range: VerseRange): void {
    this.#scriptureNavigationPort.navigate(range);
  }
}
