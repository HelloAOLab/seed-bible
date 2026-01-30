type MainControllerMethod =
  | "addApplication"
  | "removeApplication"
  | "removeApplicationById"
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
  replaceApplication(): unknown;
  updateApplication(): unknown;
}

export class MainController implements MainControllerMethods {
  /**
   * TODO: Update Effect<any,any> to properly map to key method contract args / return.
   */
  private _links: Map<MainControllerMethod, Effect<any, any>> = new Map();
  constructor() {}
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
  replaceApplication() {
    return this._performMethod("replaceApplication", Array.from(arguments));
  }
  updateApplication() {
    return this._performMethod("updateApplication", Array.from(arguments));
  }
}

// globalThis.AddApplication = addApplication;
// globalThis.RemoveApplication = removeApplication;
// globalThis.RemoveApplicationByID = removeApplicationByID;
// globalThis.ReplaceApplication = replaceApplication;
// globalThis.UpdateApplication = updateApplication;
