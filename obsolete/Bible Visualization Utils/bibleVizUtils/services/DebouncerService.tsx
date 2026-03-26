import { debounce } from "es-toolkit";

type AnyFunction = (...args: any[]) => any;

class DebouncerService {
  #debouncedFunction;

  constructor(callback: AnyFunction, debounceTime: number) {
    this.#debouncedFunction = debounce(callback, debounceTime);
  }

  execute(params?: any): void {
    this.#debouncedFunction(params);
  }
}

export { DebouncerService };
