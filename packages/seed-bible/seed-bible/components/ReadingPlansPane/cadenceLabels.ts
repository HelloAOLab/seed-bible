import {
  CADENCE_EVERY_OTHER_DAY,
  CADENCE_ONCE_DAILY,
  CADENCE_THREE_TIMES_DAILY,
  CADENCE_TWICE_DAILY,
  type CadenceOption,
} from "../../managers/ReadingPlansManager";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Translation key for each built-in cadence, keyed by its stable option id. */
const BUILT_IN_LABELS: Record<string, { key: string; defaultValue: string }> = {
  [CADENCE_ONCE_DAILY]: {
    key: "reading-plan-cadence-once-daily",
    defaultValue: "One session a day",
  },
  [CADENCE_TWICE_DAILY]: {
    key: "reading-plan-cadence-twice-daily",
    defaultValue: "Two sessions a day",
  },
  [CADENCE_THREE_TIMES_DAILY]: {
    key: "reading-plan-cadence-three-times-daily",
    defaultValue: "Three sessions a day",
  },
  [CADENCE_EVERY_OTHER_DAY]: {
    key: "reading-plan-cadence-every-other-day",
    defaultValue: "One session every other day",
  },
};

/**
 * Display name for a cadence. The built-in cadences are translated by their id,
 * so a plan authored in one language still reads correctly in another; anything
 * else falls back to the label the author stored on the plan.
 */
export function cadenceOptionLabel(
  option: CadenceOption,
  t: Translate
): string {
  const builtIn = BUILT_IN_LABELS[option.id];
  if (!builtIn) {
    return option.label;
  }
  return t(builtIn.key, { defaultValue: builtIn.defaultValue });
}
