import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import { NavMenuStateService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/NavMenuStateService";
import { BaseEventManager } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/BaseEventManager";
import type { DomainEventMap } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/events";
import {
  NAV_MENU_LEVELS,
  type NavigationState,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/navigation";
import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";
import { TABERNACLE_PIECE_KEYS } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/piece";

describe("application.services.NavMenuStateService", () => {
  let service: NavMenuStateService;
  let eventBus: BaseEventManager<DomainEventMap>;
  let onNavigationStateChanged: Mock<
    (payload: DomainEventMap["OnNavigationStateChanged"]) => void
  >;

  const pieceKey = TABERNACLE_PIECE_KEYS.MENORAH;

  const initialState: NavigationState = {
    isOpen: false,
    level: NAV_MENU_LEVELS.PIECES,
    selectedPiece: null,
    occludedBy: null,
    experience: EXPERIENCE_KEYS.TABERNACLE,
    reading: null,
  };

  const lastEmittedState = () =>
    onNavigationStateChanged.mock.lastCall?.[0].state;

  function createService(state: Partial<NavigationState> = {}) {
    return new NavMenuStateService({
      eventBus,
      initialState: { ...initialState, ...state },
    });
  }

  beforeEach(() => {
    eventBus = new BaseEventManager<DomainEventMap>();
    onNavigationStateChanged = vi.fn();
    eventBus.subscribe("OnNavigationStateChanged", onNavigationStateChanged);
    service = createService();
  });

  it("selectPiece() sets selectedPiece, occludedBy and the piece-detail level", () => {
    service.selectPiece(pieceKey);

    expect(service.getState()).toMatchObject({
      selectedPiece: pieceKey,
      occludedBy: pieceKey,
      level: NAV_MENU_LEVELS.PIECE_DETAIL,
    });
    expect(lastEmittedState()).toEqual(service.getState());
  });

  it("exposes the initial state without emitting", () => {
    const state = service.getState();

    expect(state).toEqual(initialState);
    expect(lastEmittedState()).toBeUndefined();
  });

  it("open() opens the menu and emits the new state", () => {
    service.open();

    expect(lastEmittedState()).toMatchObject({
      isOpen: true,
    });
  });

  it("close() closes the menu and emits the new state", () => {
    service.open();
    service.close();

    expect(lastEmittedState()).toMatchObject({
      isOpen: false,
    });
  });

  it("toggle() flips isOpen from its current value", () => {
    service.toggle();
    expect(lastEmittedState()).toMatchObject({
      isOpen: true,
    });
    service.toggle();
    expect(lastEmittedState()).toMatchObject({
      isOpen: false,
    });
  });

  it("showPieceList() goes back to the pieces level, keeping the selection", () => {
    service.selectPiece(pieceKey);
    service.showPieceList();
    expect(lastEmittedState()).toMatchObject({
      selectedPiece: pieceKey,
      level: NAV_MENU_LEVELS.PIECES,
    });
  });

  it("clearSelection() drops the selection but keeps occludedBy", () => {
    service.selectPiece(pieceKey);
    service.clearSelection();
    expect(lastEmittedState()).toMatchObject({
      selectedPiece: null,
      level: NAV_MENU_LEVELS.PIECES,
      occludedBy: pieceKey,
    });
  });

  it("reset() drops both the selection and occludedBy", () => {
    service.selectPiece(pieceKey);
    service.reset();
    expect(lastEmittedState()).toMatchObject({
      selectedPiece: null,
      level: NAV_MENU_LEVELS.PIECES,
      occludedBy: null,
    });
  });

  it("setExperience() replaces the experience", () => {
    const testExpKey = "test-exp" as ExperienceKey;

    service.setExperience(testExpKey);

    expect(lastEmittedState()).toMatchObject({
      experience: testExpKey,
    });
  });

  it("setReading() stores the reading, and accepts null", () => {
    const reading = { bookId: "EXO", chapterNumber: 10 };

    service.setReading(reading);

    expect(lastEmittedState()).toMatchObject({
      reading,
    });

    service.setReading(null);

    expect(lastEmittedState()).toMatchObject({
      reading: null,
    });
  });

  it("emits once per mutation, carrying the full state each time", () => {
    service.open();

    expect(onNavigationStateChanged).toHaveBeenCalledTimes(1);
    expect(onNavigationStateChanged).toHaveBeenLastCalledWith({
      state: {
        ...initialState,
        isOpen: true,
      },
    });

    service.selectPiece(pieceKey);

    expect(onNavigationStateChanged).toHaveBeenCalledTimes(2);
    expect(onNavigationStateChanged).toHaveBeenLastCalledWith({
      state: {
        ...initialState,
        isOpen: true,
        selectedPiece: pieceKey,
        occludedBy: pieceKey,
        level: NAV_MENU_LEVELS.PIECE_DETAIL,
      },
    });

    service.clearSelection();

    expect(onNavigationStateChanged).toHaveBeenCalledTimes(3);
    expect(onNavigationStateChanged).toHaveBeenLastCalledWith({
      state: {
        ...initialState,
        isOpen: true,
        selectedPiece: null,
        occludedBy: pieceKey,
        level: NAV_MENU_LEVELS.PIECES,
      },
    });
  });
});
