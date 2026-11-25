import { signal, type ReadonlySignal } from "@preact/signals";
import {
  startShowSharedComponents,
  stopShowSharedComponents,
} from "./showSharedComponents";
import { DEV_TOOLS_ON_KEY, lockDevTools } from "./devToolsUnlock";

// Tools for working on Seed Bible, switched on from Settings → Developer.
// This module is only fetched once they're unlocked (see devToolsUnlock.ts).
// Labels stay in English: they're for the team, not for translators.

export interface DevTool {
  id: string;
  label: string;
  description: string;
  /**
   * Whether production and alpha builds offer it. Anyone can unlock the
   * developer tools there, so only mark a tool that's harmless for any user
   * to switch on: never one that changes data, turns on feature flags, shows
   * other people's information or gets around sign-in.
   */
  safeInProduction: boolean;
  start: () => void;
  stop: () => void;
}

const ALL_DEV_TOOLS: readonly DevTool[] = [
  {
    id: "showSharedComponents",
    label: "Show shared components",
    description:
      "Outlines everything drawn by a component from components/index.tsx. Hover one to see its name.",
    safeInProduction: true,
    start: startShowSharedComponents,
    stop: stopShowSharedComponents,
  },
];

/** The tools this build offers. */
export const DEV_TOOLS: readonly DevTool[] = ALL_DEV_TOOLS.filter(
  (tool) => import.meta.env.DEV || tool.safeInProduction
);

function readStored(): Set<string> {
  try {
    const ids: unknown = JSON.parse(
      localStorage.getItem(DEV_TOOLS_ON_KEY) ?? "[]"
    );
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
  localStorage.setItem(DEV_TOOLS_ON_KEY, JSON.stringify([...stored]));
  enabled.value = next;
}

/** Switches every tool off and locks the developer tools again. */
export function hideDevTools() {
  for (const tool of DEV_TOOLS) {
    if (enabled.value.has(tool.id)) tool.stop();
  }
  enabled.value = new Set();
  lockDevTools();
}
