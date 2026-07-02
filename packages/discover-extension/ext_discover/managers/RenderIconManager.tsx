import { computed, effect, signal } from "@preact/signals";
import { getRenderIconFirstItemId } from "ext_discover.hooks.getRenderIconFirstItemId";
import type { RenderIconManager } from "ext_discover.interfaces.managers.RenderIconManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, RenderIconManager>();

export function getRenderIconManager(scope: string): RenderIconManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createRenderIconManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createRenderIconManager(): RenderIconManager {
  const mylist = signal<any[]>([]);
  const isAllowSet = signal(false);

  const firstItemId = computed(() => getRenderIconFirstItemId(mylist.value));

  const setMylist = (list: any[]) => {
    mylist.value = list;
  };

  const syncList = (list: any[]) => {
    mylist.value = list;
  };

  const setAllowSet = (value: boolean) => {
    isAllowSet.value = value;
  };

  effect(() => {
    if (isAllowSet.value) {
      G.SetRenderMylist = setMylist;
    }
  });

  return {
    mylist,
    firstItemId,
    syncList,
    setAllowSet,
    setMylist,
  };
}
