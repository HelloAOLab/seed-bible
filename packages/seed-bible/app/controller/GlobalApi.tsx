export interface GlobalApi {
  /**
   * Whether the app has finished starting up successfully.
   */
  AppStartedSuccessfully: boolean;

  /**
   *
   * @returns
   */
  Open: () => void;
}

/**
 * A temporary class to hold global API methods and properties.
 * This is a stopgap solution until we can refactor the app to use a more robust state management system.
 */
export class TempGlobalAPI implements GlobalApi {
  private _appStartedSuccessfully: boolean = false;
  constructor() {}

  get AppStartedSuccessfully(): boolean {
    return this._appStartedSuccessfully;
  }

  set AppStartedSuccessfully(value: boolean) {
    this._appStartedSuccessfully = value;
  }
}

// globalThis.AppStartedSuccessfully = false;

// //this for defining nav functions globaly
// globalThis.Open = () => { };
// globalThis.OpenNextChapter = () => { };
// globalThis.OpenPrevChapter = () => { };
// globalThis.SpaceLayouts = {}; // To store layout per space
// globalThis.SpaceScreens = {}; // Already used for screen count
// globalThis.CheckToolbarOverflow = () => { };
