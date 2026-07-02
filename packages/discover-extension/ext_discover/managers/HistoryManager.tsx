import { computed, effect, signal } from "@preact/signals";
import type { HistoryManager } from "ext_discover.interfaces.managers.HistoryManager";

const G = globalThis as Record<string, any>;

const managersById = new Map<string, HistoryManager>();

export function getHistoryManager(id: string): HistoryManager {
  const existing = managersById.get(id);
  if (existing) return existing;

  const manager = createHistoryManager(id);
  managersById.set(id, manager);
  return manager;
}

export function createHistoryManager(id: string): HistoryManager {
  const history = signal<any[]>(G?.[`${id}currentHistory`] || []);

  const setHistory = (value: any[] | ((prev: any[]) => any[])) => {
    history.value = typeof value === "function" ? value(history.value) : value;
  };

  const addDataToHistory = (data: any) => {
    const current = history.value;
    const lastData = current[current.length - 1];
    const isSame = G.objectComparator(data, lastData, ["content"]);
    if (!isSame) {
      history.value = [...current, data];
    }
  };

  const deleteDataFromHistory = (index: number | string[]) => {
    if (G.creatingPlaylist) return;
    const idsMap: Record<string, boolean> = {};
    const isArray = Array.isArray(index);
    if (isArray) index.forEach((itemId) => (idsMap[itemId] = true));

    if (isArray) {
      history.value = history.value.filter((data) => !idsMap[data.id]);
    } else {
      const old = [...history.value];
      old.splice(index as number, 1);
      history.value = old;
    }
  };

  const historyList = computed(() => history.value);

  effect(() => {
    const h = history.value;
    G[`${id}currentHistory`] = h;
    G.setHistoryLocale?.(h, id);
    G[`${id}AddDataToHistory`] = addDataToHistory;
    return () => {
      G[`${id}AddDataToHistory`] = null;
    };
  });

  return {
    history,
    historyList,
    setHistory,
    addDataToHistory,
    deleteDataFromHistory,
  };
}
