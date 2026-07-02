import { GetLabel } from "ext_discover.components.GetLabel";

export function registerGetLabel() {
  const G = globalThis as Record<string, any>;
  G.GetLabel = GetLabel;
}
