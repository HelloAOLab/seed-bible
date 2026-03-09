declare module "https://esm.sh/*" {
  export interface Signal<T> {
    value: T;
  }

  export function signal<T>(value: T): Signal<T>;
  export function useSignal<T>(value: T): Signal<T>;

  export function useMemo<T>(fn: () => T, deps: unknown[]): T;
  export function useEffect(
    fn: () => void | (() => void),
    deps: unknown[]
  ): void;
  export function useState<T>(
    initialValue: T
  ): [T, (value: T | ((prev: T) => T)) => void];
  export function useRef<T>(initialValue: T): { current: T };

  export function render(element: unknown, container: Element): void;
}
