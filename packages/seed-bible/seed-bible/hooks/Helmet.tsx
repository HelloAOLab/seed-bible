import { signal, type Signal } from "@preact/signals";
import { createContext } from "preact";
import { useContext } from "preact/hooks";

export interface HelmetData {
  title: Signal<string>;
  meta: Signal<{ name: string; content: string }[]>;

  setMeta(name: string, content: string): void;
}

export function createHelmetData(): HelmetData {
  const title = signal("");
  const meta = signal<{ name: string; content: string }[]>([]);

  function setMeta(name: string, content: string) {
    meta.value = [
      ...meta.value.filter((m) => m.name !== name),
      { name, content },
    ];
  }

  return { title, meta, setMeta };
}

export const HelmetContext = createContext<HelmetData>(createHelmetData());

export function useHelmet() {
  return useContext(HelmetContext);
}
