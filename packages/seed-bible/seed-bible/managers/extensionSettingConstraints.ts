/**
 * Constraint checks for an extension setting. Kept free of app imports so the
 * extension.json schema (loaded while ESLint starts) can share them.
 */

export type ExtensionSettingValue = string | boolean | number;

export interface ExtensionStringSettingDefinition {
  type: "string";
  /**
   * Used when nothing else applies: no value the user set themselves, and no
   * default from the active Customization (see `ExtensionSettingsManager`).
   */
  default?: string;
  /**
   * The only values this setting accepts. The Configure form renders a
   * dropdown; each option's label is `setting-<key>-option-<value>` in the
   * extension's own translations, falling back to the value itself.
   */
  enum?: string[];
}

export interface ExtensionNumberSettingDefinition {
  type: "number";
  /** See `ExtensionStringSettingDefinition.default`. */
  default?: number;
  /** Inclusive lower bound. Sets `min` on the field. */
  minimum?: number;
  /** Inclusive upper bound. Sets `max` on the field. */
  maximum?: number;
  /**
   * The value must be a multiple of this, the way JSON Schema's `multipleOf`
   * works (`1` means a whole number). Sets `step` on the field.
   */
  multipleOf?: number;
}

export interface ExtensionBooleanSettingDefinition {
  type: "boolean";
  /** See `ExtensionStringSettingDefinition.default`. */
  default?: boolean;
}

export type ExtensionSettingDefinition =
  | ExtensionStringSettingDefinition
  | ExtensionNumberSettingDefinition
  | ExtensionBooleanSettingDefinition;

function finiteBound(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/** A step of 0 or less can't divide a value, so it isn't a constraint. */
function positiveStep(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function stringChoices(enumValues: string[] | undefined): string[] | undefined {
  if (!Array.isArray(enumValues)) {
    return undefined;
  }
  const choices = enumValues.filter((entry) => typeof entry === "string");
  return choices.length > 0 ? choices : undefined;
}

/**
 * True when `value / divisor` is an integer. A small tolerance keeps a value
 * like 0.3 valid for `multipleOf: 0.1`, which binary floats can't represent
 * exactly.
 */
export function isMultipleOf(value: number, divisor: number): boolean {
  const quotient = value / divisor;
  if (!Number.isFinite(quotient)) {
    return false;
  }
  return Math.abs(quotient - Math.round(quotient)) < 1e-8;
}

/**
 * Why `value` fails this setting, one sentence per problem. Empty when the
 * value is acceptable. A constraint that isn't a usable number or a non-empty
 * list of strings is left out, so a broken keyword doesn't blame every value.
 */
export function settingConstraintProblems(
  value: unknown,
  definition: ExtensionSettingDefinition
): string[] {
  if (typeof value !== definition.type) {
    return [
      `${formatSettingValue(value)} is a ${typeof value}, but this setting is a ${definition.type}`,
    ];
  }
  if (definition.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return [`${formatSettingValue(value)} is not a finite number`];
    }
    const problems: string[] = [];
    const minimum = finiteBound(definition.minimum);
    const maximum = finiteBound(definition.maximum);
    const step = positiveStep(definition.multipleOf);
    if (minimum !== undefined && value < minimum) {
      problems.push(`${value} is less than minimum ${minimum}`);
    }
    if (maximum !== undefined && value > maximum) {
      problems.push(`${value} is greater than maximum ${maximum}`);
    }
    if (step !== undefined && !isMultipleOf(value, step)) {
      problems.push(`${value} is not a multiple of ${step}`);
    }
    return problems;
  }
  if (definition.type === "string" && typeof value === "string") {
    const choices = stringChoices(definition.enum);
    if (choices !== undefined && !choices.includes(value)) {
      return [
        `${JSON.stringify(value)} is not one of ${choices.map((choice) => JSON.stringify(choice)).join(", ")}`,
      ];
    }
  }
  return [];
}

/**
 * True when `value` is the setting's declared type and honors every constraint
 * that setting declares. A constraint that isn't a usable number or a
 * non-empty list of strings is ignored, so a broken keyword doesn't make
 * every value fail.
 */
export function settingValueSatisfiesDefinition(
  value: unknown,
  definition: ExtensionSettingDefinition
): value is ExtensionSettingValue {
  return settingConstraintProblems(value, definition).length === 0;
}

function formatSettingValue(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return typeof value;
}

/**
 * A value that satisfies the setting, for when a form has to store something
 * before the viewer has typed. Prefers the declared default; otherwise the
 * first choice, or the smallest in-range number.
 */
export function firstAcceptableSettingValue(
  definition: ExtensionSettingDefinition
): ExtensionSettingValue {
  if (
    definition.default !== undefined &&
    settingValueSatisfiesDefinition(definition.default, definition)
  ) {
    return definition.default;
  }
  if (definition.type === "string") {
    return stringChoices(definition.enum)?.[0] ?? "";
  }
  if (definition.type === "boolean") {
    return false;
  }
  const minimum = finiteBound(definition.minimum);
  const maximum = finiteBound(definition.maximum);
  const step = positiveStep(definition.multipleOf);
  let candidate = minimum ?? 0;
  if (step !== undefined) {
    candidate = alignToStep(candidate, step, "up");
  }
  if (maximum !== undefined && candidate > maximum) {
    candidate =
      step !== undefined ? alignToStep(maximum, step, "down") : maximum;
  }
  if (
    settingValueSatisfiesDefinition(candidate, definition) ||
    definition.default === undefined
  ) {
    return candidate;
  }
  return definition.default;
}

/**
 * `min` / `max` / `step` for a number field. When `multipleOf` is set, the
 * bounds are moved onto that grid: HTML's step is counted from `min`, while
 * `multipleOf` is counted from zero, so an unaligned `min` would let the
 * spinner land on values the constraint rejects.
 */
export function numberFieldLimits(
  definition: ExtensionNumberSettingDefinition
): {
  min?: number;
  max?: number;
  step?: number;
} {
  const step = positiveStep(definition.multipleOf);
  let min = finiteBound(definition.minimum);
  let max = finiteBound(definition.maximum);
  if (step !== undefined) {
    if (min !== undefined) {
      min = alignToStep(min, step, "up");
    }
    if (max !== undefined) {
      max = alignToStep(max, step, "down");
    }
  }
  if (min !== undefined && max !== undefined && min > max) {
    return step === undefined ? {} : { step };
  }
  return {
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
    ...(step === undefined ? {} : { step }),
  };
}

function alignToStep(
  bound: number,
  step: number,
  direction: "up" | "down"
): number {
  const quotient = bound / step;
  const ticks =
    direction === "up"
      ? Math.ceil(quotient - 1e-8)
      : Math.floor(quotient + 1e-8);
  const aligned = ticks * step;
  const places = Math.min(
    12,
    (step.toString().split(".")[1] ?? "").replace(/e.*$/, "").length
  );
  return Number(aligned.toFixed(places));
}
