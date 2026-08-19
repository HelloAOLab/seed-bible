import type { VNode } from "preact";
import { MaterialIcon } from "@packages/seed-bible/seed-bible/components";
import { EXPERIENCE_KEYS, type ExperienceKey } from "./experience";

export interface ExperienceMeta {
  title: { key: string; defaultValue: string; ns: string };
  icon: () => VNode;
}

export const EXPERIENCE_META: Record<ExperienceKey, ExperienceMeta> = {
  [EXPERIENCE_KEYS.TABERNACLE]: {
    title: { key: "title", defaultValue: "Tabernacle", ns: "tabernacle" },
    icon: () => <MaterialIcon>camping</MaterialIcon>,
  },
};
