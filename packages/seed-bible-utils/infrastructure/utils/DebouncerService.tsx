import { debounce } from "es-toolkit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

export class DebouncerService {
  #debouncedFunction;

  constructor(callback: AnyFunction, debounceTime: number) {
    this.#debouncedFunction = debounce(callback, debounceTime);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (params?: any) => void = (params) => {
    this.#debouncedFunction(params);
  };
}
