import type { ExperienceKey } from "../../domain/models/experience";
import {
  NAV_MENU_LEVELS,
  type NavigationState,
} from "../../domain/models/navigation";
import type { PieceKey } from "../../domain/models/piece";
import type { ReadingState } from "../../domain/models/scripture";
import type { DomainEventPort } from "../ports/in/eventBus";
import type { NavMenuStatePort } from "../ports/in/NavMenuState";

interface ServiceParams {
  eventBus: DomainEventPort;
  initialState: NavigationState;
}

export class NavMenuStateService implements NavMenuStatePort {
  #eventBus: ServiceParams["eventBus"];
  #state: NavigationState;

  constructor({ eventBus, initialState }: ServiceParams) {
    this.#eventBus = eventBus;
    this.#state = initialState;
  }

  getState(): NavigationState {
    return this.#state;
  }

  open(): void {
    this.#setState({ isOpen: true });
  }

  close(): void {
    this.#setState({ isOpen: false });
  }

  toggle(): void {
    this.#setState({ isOpen: !this.#state.isOpen });
  }

  selectPiece(key: PieceKey): void {
    this.#setState({
      selectedPiece: key,
      occludedBy: key,
      level: NAV_MENU_LEVELS.PIECE_DETAIL,
    });
  }

  showPieceList(): void {
    this.#setState({ level: NAV_MENU_LEVELS.PIECES });
  }

  clearSelection(): void {
    this.#setState({
      selectedPiece: null,
      level: NAV_MENU_LEVELS.PIECES,
    });
  }

  reset(): void {
    this.#setState({
      selectedPiece: null,
      occludedBy: null,
      level: NAV_MENU_LEVELS.PIECES,
    });
  }

  setExperience(experience: ExperienceKey): void {
    this.#setState({ experience });
  }

  setReading(reading: ReadingState | null): void {
    this.#setState({ reading });
  }

  #setState(patch: Partial<NavigationState>): void {
    this.#state = { ...this.#state, ...patch };
    this.#eventBus.emit("OnNavigationStateChanged", { state: this.#state });
  }
}
