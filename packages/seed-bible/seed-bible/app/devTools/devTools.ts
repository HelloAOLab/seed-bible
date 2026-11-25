import { signal, type ReadonlySignal } from "@preact/signals";
import {
  startShowSharedComponents,
  stopShowSharedComponents,
} from "./showSharedComponents";

// Tools for working on Seed Bible, switched on from Settings → Developer.
// Only dev builds load this module (see app/init.tsx and SettingsPage), so
// none of it ships. Labels stay in English: they're for the team, not for
// translators.

export interface DevTool {
  id: string;
  label: string;
  description: string;
  start: () => void;
  stop: () => void;
}

export const DEV_TOOLS: readonly DevTool[] = [
  {
    id: "showSharedComponents",
    label: "Show shared components",
    description:
      "Outlines everything drawn by a component from components/index.tsx. Hover one to see its name.",
    start: startShowSharedComponents,
    stop: stopShowSharedComponents,
  },
];

const STORAGE_KEY = "sb-dev-tools";

function readStored(): Set<string> {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(
      Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === "string")
        : []
    );
  } catch {
    return new Set();
  }
}

const enabled = signal<ReadonlySet<string>>(new Set());
export const enabledDevTools: ReadonlySignal<ReadonlySet<string>> = enabled;

export function startDevTools() {
  const stored = readStored();
  const on = new Set<string>();
  for (const tool of DEV_TOOLS) {
    if (stored.has(tool.id)) {
      tool.start();
      on.add(tool.id);
    }
  }
  enabled.value = on;
}

export function setDevToolEnabled(id: string, on: boolean) {
  const tool = DEV_TOOLS.find((t) => t.id === id);
  if (!tool) return;

  const stored = readStored();
  const next = new Set(enabled.value);
  if (on) {
    stored.add(id);
    next.add(id);
    tool.start();
  } else {
    stored.delete(id);
    next.delete(id);
    tool.stop();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...stored]));
  enabled.value = next;
}
