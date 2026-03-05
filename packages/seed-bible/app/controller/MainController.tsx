type MainControllerMethod =
  | "addApplication"
  | "removeApplication"
  | "removeApplicationById"
  | "removeApplicationByLabel"
  | "replaceApplication"
  | "updateApplication";

type Effect<A extends Array<any>, R> = (...args: A) => R;

/**
 * TODO: Provide arguments and return types.
 */
interface MainControllerMethods {
  addApplication(): unknown;
  removeApplication(): unknown;
  removeApplicationById(): unknown;
  removeApplicationByLabel(): unknown;
  replaceApplication(): unknown;
  updateApplication(): unknown;
}

export class MainController implements MainControllerMethods {
  _performMethod: any;
  updateApplication: any;
  replaceApplication: any;
  removeApplicationByLabel: any;
  removeApplicationById: any;
  removeApplication: any;
  addApplication: any;
  /**
   * TODO: Update Effect<any,any> to properly map to key method contract args / return.
   */
  private _links: Map<MainControllerMethod, Effect<any, any>> = new Map();
  constructor() {
    refactorme_setGlobals(
      this.addApplication.bind(this),
      this.removeApplication.bind(this),
      this.removeApplicationById.bind(this),
      this.removeApplicationByLabel.bind(this),
      this.replaceApplication.bind(this),
      this.updateApplication.bind(this)
    );
  }
  /**
   * TODO: Implement spread args with proper type mapping.
   */
  private _performMethod(m: MainControllerMethod, args: Array<any>) {
    try {
      const effect = this._links.get(m);
      if (!effect) return null;
      return effect(...args);
    } catch (err) {
      console.error(`Error Performing: ${m}`, err);
    }
  }

  linkViewMethod(m: MainControllerMethod, effect: (...args: any) => any) {
    this._links.set(m, effect);
  }

  addApplication() {
    return this._performMethod("addApplication", Array.from(arguments));
  }
  removeApplication() {
    return this._performMethod("removeApplication", Array.from(arguments));
  }
  removeApplicationById() {
    return this._performMethod("removeApplicationById", Array.from(arguments));
  }
  removeApplicationByLabel() {
    return this._performMethod(
      "removeApplicationByLabel",
      Array.from(arguments)
    );
  }
  replaceApplication() {
    return this._performMethod("replaceApplication", Array.from(arguments));
  }
  updateApplication() {
    return this._performMethod("updateApplication", Array.from(arguments));
  }
}

function refactorme_setGlobals(
  addApplication: any,
  removeApplication: any,
  removeApplicationByID: any,
  removeApplicationByLabel: any,
  replaceApplication: any,
  updateApplication: any
) {
  globalThis.AddApplication = addApplication;
  globalThis.RemoveApplication = removeApplication;
  globalThis.RemoveApplicationByID = removeApplicationByID;
  globalThis.RemoveApplicationByLabel = removeApplicationByLabel;
  globalThis.ReplaceApplication = replaceApplication;
  globalThis.UpdateApplication = updateApplication;
}
