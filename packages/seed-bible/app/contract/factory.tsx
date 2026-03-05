/**
 * A factory who provides an implementation of contract P, from variable E.
 * * Includes an internal caching mechanism.
 */
export abstract class ProviderFactory<E extends string | number | symbol, P> {
  _getProvider: any;
  private _providerCache: Partial<Record<E, P>> = {};
  constructor() {}

  /**
   * A method which by some means provides an implementation of P via E.
   * * Caching will map E to the returned P internally on first invocation;
   * * ensure E is NOT conditionally routed to it's P implementation.
   */
  protected abstract _getProvider(e: E): Promise<P>;

  /**
   * Get provider from factory via key.
   */
  async retrieveProvider(key: E): Promise<P> {
    return (
      this._providerCache[key] ||
      (this._providerCache[key] = await this._getProvider(key))
    );
  }
}
