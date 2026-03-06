declare module "https://esm.sh/*" {
  export interface Signal<T> {
    value: T;
  }

  export function signal<T>(value: T): Signal<T>;
}
