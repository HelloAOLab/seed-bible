declare module "https://esm.sh/@preact/signals*" {
  export interface Signal<T> {
    value: T;
  }

  export function signal<T>(value: T): Signal<T>;
}
