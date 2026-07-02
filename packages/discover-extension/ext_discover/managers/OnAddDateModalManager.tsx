import { signal } from "@preact/signals";
import type { OnAddDateModalManager } from "ext_discover.interfaces.managers.OnAddDateModalManager";

const G = globalThis as Record<string, any>;
const APP_NAME = "on-date-add";

let singleton: OnAddDateModalManager | undefined;
let onAttachRef: ((date: string) => void) | null = null;

export function getOnAddDateModalManager(): OnAddDateModalManager {
  if (!singleton) {
    singleton = createOnAddDateModalManager();
  }
  return singleton;
}

export function createOnAddDateModalManager(): OnAddDateModalManager {
  const date = signal(G.FORMAT_YYYY_MM_DD(new Date()));

  const close = () => {
    os.unregisterApp(APP_NAME);
  };

  const save = () => {
    onAttachRef?.(date.value);
    close();
  };

  const init = (opts: { onAttach: (date: string) => void }) => {
    onAttachRef = opts.onAttach;
    date.value = G.FORMAT_YYYY_MM_DD(new Date());
  };

  const setDate = (value: string) => {
    date.value = value;
  };

  return {
    date,
    init,
    setDate,
    save,
    close,
  };
}
