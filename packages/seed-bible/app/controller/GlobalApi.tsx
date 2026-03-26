import { EventController } from "app.controller.EventController";
import type { GlobalHookEventSpec } from "app.contract.globalHooks";

export interface GlobalApiProperties {
  /**
   * Whether the app has finished starting up successfully.
   */
  appStartedSuccessfully: boolean;
  /**
   * The default portal name to use for the grid and map portals.
   */
  defaultPortalName: string;

  /**
   * A controller for managing global events across the app.
   * This is a simple pub/sub system that can be used to communicate between different parts of the app without having to pass props down through multiple levels of components.
   */
  hooks: EventController<GlobalHookEventSpec>;

  spaceLayouts: Record<string, any>; // To store layout per space

  spaceScreens: Record<string, any>; // Already used for screen count

  mainThemeCSS: string;
}

export interface GlobalApiMethods {
  checkToolbarOverflow: () => void;

  open: () => void;

  openNextChapter: () => void;

  openPrevChapter: () => void;

  /**
   * Updates the canvas style with position's and size based on the known bounds of the main canvas element.
   * Also updates the grid portal tag based on whether or not the canvas was found.
   * TODO: This should be refactored to be concerned only with the canvas, and the grid portal tag update should be moved to a separate method.
   */
  updateCanvasStyleAndGridPortal: () => void;

  /**
   * A method to set the canvas style positions directly.
   * @param positions An object containing left, top, width, height, and borderRadius to set on the canvas style.
   */
  setCanvasStylePositions: (positions: {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius: string;
  }) => void;
}

export interface GlobalApi extends GlobalApiProperties, GlobalApiMethods {}

/**
 * A temporary class to hold global API methods and properties.
 * This is a stopgap solution until we can refactor the app to use a more robust state management system.
 */
export class TempGlobalAPI implements GlobalApi {
  private _appStartedSuccessfully: boolean = false;
  private _defaultPortalName: string = "";
  private _mainThemeCSS: string = "";
  private _spaceLayouts: Record<string, any> = {};
  private _spaceScreens: Record<string, any> = {};
  private _hooks: EventController<GlobalHookEventSpec> =
    new EventController<GlobalHookEventSpec>();

  constructor() {}

  get hooks(): EventController<GlobalHookEventSpec> {
    return this._hooks;
  }

  checkToolbarOverflow() {}
  open() {}
  openNextChapter() {}
  openPrevChapter() {}

  get appStartedSuccessfully(): boolean {
    return this._appStartedSuccessfully;
  }

  set appStartedSuccessfully(value: boolean) {
    this._appStartedSuccessfully = value;
  }

  get defaultPortalName(): string {
    return this._defaultPortalName;
  }

  set defaultPortalName(value: string) {
    this._defaultPortalName = value;
  }

  get mainThemeCSS(): string {
    return this._mainThemeCSS;
  }

  set mainThemeCSS(value: string) {
    this._mainThemeCSS = value;
  }

  get spaceLayouts(): Record<string, any> {
    return this._spaceLayouts;
  }
  set spaceLayouts(value: Record<string, any>) {
    this._spaceLayouts = value;
  }
  get spaceScreens(): Record<string, any> {
    return this._spaceScreens;
  }
  set spaceScreens(value: Record<string, any>) {
    this._spaceScreens = value;
  }

  setCanvasStylePositions(positions: {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius: string;
  }) {
    this.hooks.emit("setCanvasStylePositions", positions);
  }

  updateCanvasStyleAndGridPortal() {
    const bounds = getLastMainCanvasBounds();
    if (!bounds) {
      refactorme_WhenNoCanvas();
      return;
    }
    refactorme_WhenCanvas(this.defaultPortalName || "thePortal");
    this.setCanvasStylePositions({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      borderRadius: bounds.borderRadius,
    });
  }
}

function refactorme_getLastMainCanvas() {
  const nodes = document.querySelectorAll(".mainCanvas");
  return nodes[nodes.length - 1]; // last match
}

function getLastMainCanvasBounds() {
  const el = refactorme_getLastMainCanvas();
  if (!el) return null;
  const style = window.getComputedStyle(el);
  const { left, top, width, height } = el.getBoundingClientRect();
  const borderRadius = style.borderRadius;
  return { left, top, width, height, borderRadius };
}

/**
 * Business logic to perform when the canvas is not found.
 */
function refactorme_WhenNoCanvas() {
  if (!configBot?.tags || typeof configBot.tags !== "object") return;
  configBot.tags.gridPortal = null;
  configBot.tags.mapPortal = null;
}

function refactorme_WhenCanvas(defaultPortalName: string = "thePortal") {
  if (!configBot?.tags || typeof configBot.tags !== "object") return;
  configBot.tags.gridPortal = defaultPortalName;
}
