import type { VNode } from "preact";
import { MaterialIcon } from "@packages/seed-bible/seed-bible/components";
import { EXPERIENCE_KEYS, type ExperienceKey } from "./experience";

export interface ExperienceMeta {
  title: { key: string; defaultValue: string; ns: string };
  description: { key: string; defaultValue: string; ns: string };
  icon: () => VNode;
}

export const EXPERIENCE_META: Record<ExperienceKey, ExperienceMeta> = {
  [EXPERIENCE_KEYS.SOLOMON_TEMPLE]: {
    title: {
      key: "experience-solomon-temple",
      defaultValue: "Solomon's temple",
      ns: "house-of-the-lord",
    },
    description: {
      key: "experience-solomon-temple-description",
      defaultValue:
        "The temple Solomon raised in Jerusalem, explorable piece by piece.",
      ns: "house-of-the-lord",
    },
    icon: () => <MaterialIcon>camping</MaterialIcon>,
  },
  [EXPERIENCE_KEYS.TABERNACLE]: {
    title: {
      key: "experience-tabernacle",
      defaultValue: "Tabernacle",
      ns: "house-of-the-lord",
    },
    description: {
      key: "experience-tabernacle-description",
      defaultValue:
        "The portable sanctuary of Exodus, explorable piece by piece.",
      ns: "house-of-the-lord",
    },
    icon: () => <MaterialIcon>camping</MaterialIcon>,
  },
};
