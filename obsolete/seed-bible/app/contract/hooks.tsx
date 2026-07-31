/**
 * See AuxLibraryDefinitions.d.ts
 */
export interface appHooks {
  /**
   * Returns a stateful value, and a function to update it.
   * @param initialState The initial value (or a function that returns the initial value)
   */
  useState<S>(initialState: S | (() => S)): [S, StateUpdater<S>];

  /**
   * Returns a stateful value, and a function to update it.
   */
  useState<S = undefined>(): [S | undefined, StateUpdater<S | undefined>];

  /**
   * An alternative to `useState`.
   *
   * `useReducer` is usually preferable to `useState` when you have complex state logic that involves
   * multiple sub-values. It also lets you optimize performance for components that trigger deep
   * updates because you can pass `dispatch` down instead of callbacks.
   * @param reducer Given the current state and an action, returns the new state
   * @param initialState The initial value to store as state
   */
  useReducer<S, A>(
    reducer: Reducer<S, A>,
    initialState: S
  ): [S, (action: A) => void];

  /**
   * An alternative to `useState`.
   *
   * `useReducer` is usually preferable to `useState` when you have complex state logic that involves
   * multiple sub-values. It also lets you optimize performance for components that trigger deep
   * updates because you can pass `dispatch` down instead of callbacks.
   * @param reducer Given the current state and an action, returns the new state
   * @param initialArg The initial argument to pass to the `init` function
   * @param init A function that, given the `initialArg`, returns the initial value to store as state
   */
  useReducer<S, A, I>(
    reducer: Reducer<S, A>,
    initialArg: I,
    init: (arg: I) => S
  ): [S, (action: A) => void];

  /**
   * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
   * (`initialValue`). The returned object will persist for the full lifetime of the component.
   *
   * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
   * value around similar to how you’d use instance fields in classes.
   *
   * @param initialValue the initial value to store in the ref object
   */
  useRef<T>(initialValue: T): MutableRef<T>;

  /**
   * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
   * (`initialValue`). The returned object will persist for the full lifetime of the component.
   *
   * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
   * value around similar to how you’d use instance fields in classes.
   *
   * @param initialValue the initial value to store in the ref object
   */
  useRef<T>(initialValue: T | null): Ref<T>;

  /**
   * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
   * (`initialValue`). The returned object will persist for the full lifetime of the component.
   *
   * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
   * value around similar to how you’d use instance fields in classes.
   */
  useRef<T = undefined>(): MutableRef<T | undefined>;

  /**
   * Accepts a function that contains imperative, possibly effectful code.
   * The effects run after browser paint, without blocking it.
   *
   * @param effect Imperative function that can return a cleanup function
   * @param inputs If present, effect will only activate if the values in the list change (using ===).
   */
  useEffect(effect: EffectCallback, inputs?: Inputs): void;

  /**
   * Accepts a function that contains imperative, possibly effectful code.
   * Use this to read layout from the DOM and synchronously re-render.
   * Updates scheduled inside `useLayoutEffect` will be flushed synchronously, after all DOM mutations but before the browser has a chance to paint.
   * Prefer the standard `useEffect` hook when possible to avoid blocking visual updates.
   *
   * @param effect Imperative function that can return a cleanup function
   * @param inputs If present, effect will only activate if the values in the list change (using ===).
   */
  useLayoutEffect(effect: EffectCallback, inputs?: Inputs): void;

  /**
   * Returns a memoized version of the callback that only changes if one of the `inputs`
   * has changed (using ===).
   */
  useCallback<T extends Function>(callback: T, inputs: Inputs): T;

  /**
   * Pass a factory function and an array of inputs.
   * useMemo will only recompute the memoized value when one of the inputs has changed.
   * This optimization helps to avoid expensive calculations on every render.
   * If no array is provided, a new value will be computed whenever a new function instance is passed as the first argument.
   */
  // for `inputs`, allow undefined, but don't make it optional as that is very likely a mistake
  useMemo<T>(factory: () => T, inputs: Inputs | undefined): T;

  /**
   * Customize the displayed value in the devtools panel.
   *
   * @param value Custom hook name or object that is passed to formatter
   * @param formatter Formatter to modify value before sending it to the devtools
   */
  useDebugValue<T>(value: T, formatter?: (value: T) => any): void;

  useErrorBoundary(
    callback?: (error: any) => Promise<void> | void
  ): [any, () => void];

  /**
   * Renders the given virtual DOM into the given parent element.
   * @param vdom The VDOM that should be rendered.
   * @param parent The element that the VDOM should be added inside of.
   * @param replaceNode The element that should be replaced. Can be used as a performance optimization if you know which element was changed by the VDOM.
   */
  render(
    vdom: any,
    parent: Element | Document | ShadowRoot | DocumentFragment,
    replaceNode?: Element | Text
  ): void;

  /**
   * Creates a hook that can be used to get a reference to the HTML element that a Preact component is attached to.
   */
  createRef<T = any>(): RefObject<T>;

  /**
   * Creates a new context that can be used for sharing values between components.
   * @param defaultValue The value.
   */
  createContext<T>(defaultValue: T): PreactContext<T>;
}

/**
 * The types/interfaces below are required for appHooks interface.
 * See: AuxLibraryDefinitions.d.ts
 */

export type Reducer<S, A> = (prevState: S, action: A) => S;
interface Ref<T> {
  readonly current: T | null;
}

type Inputs = ReadonlyArray<unknown>;

export type RefObject<T> = { current: T | null };

export interface PreactContext<T> {
  Consumer: any;
  Provider: any;
  displayName?: string;
}

type EffectCallback = () => void | (() => void);

interface MutableRef<T> {
  current: T;
}

export type StateUpdater<S> = (value: S | ((prevState: S) => S)) => void;
