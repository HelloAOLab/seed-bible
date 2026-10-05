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
  /**
   * The id of an entry in the extension's `sensitive` section. A sensitive
   * value is never read back into the browser: it is stored in a CasualOS
   * proxy record that attaches it to requests sent to that entry's host (see
   * `ExtensionSensitiveProxyDefinition`). Can't be combined with `default` or
   * `enum`, since both would publish the value in the manifest.
   */
  sensitive?: string;
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

/**
 * One destination that sensitive settings are sent to, declared once in the
 * extension's `sensitive` section and shared by every setting that names it.
 * Each becomes one CasualOS proxy record per viewer, so all of its settings
 * travel together on every request made through it.
 */
/**
 * Who may send requests through a viewer's proxy: `private` means only the
 * viewer, `public` anyone who knows the proxy's address. Nobody can read the
 * values either way. Always `private` until the viewer chooses otherwise; an
 * extension can't pick it, so it can't make a viewer's key usable by others
 * by default.
 */
export type ExtensionSensitiveProxyVisibility = "private" | "public";

export interface ExtensionSensitiveProxyDefinition {
  /**
   * Where requests go, as a host with an optional port (`api.example.com`,
   * `example.com:8443`). The default: a viewer can pick another host when
   * they save their values, and the extension keeps addressing this one.
   */
  host: string;
  /**
   * Request property -> the key of the setting whose value fills it. The
   * properties are the ones CasualOS proxies support (see
   * {@link isSupportedSensitiveRequestProperty}).
   */
  requestMapping: Record<string, string>;
}

// CasualOS refuses these so a proxy can't spoof who sent a request or how it
// was routed. Mirrors `FORBIDDEN_CUSTOM_HEADER_NAMES` and
// `FORBIDDEN_CUSTOM_HEADER_PREFIXES` in CasualOS's `ProxyRecordData.ts`.
const FORBIDDEN_CUSTOM_HEADER_NAMES: ReadonlySet<string> = new Set([
  "x-real-ip",
  "x-client-ip",
  "x-cluster-client-ip",
  "x-true-client-ip",
  "x-originating-ip",
  "x-remote-ip",
  "x-remote-addr",
  "x-proxyuser-ip",
  "x-host",
  "x-http-host-override",
  "x-original-host",
  "x-original-url",
  "x-original-uri",
  "x-original-forwarded-for",
  "x-rewrite-url",
  "x-http-method",
  "x-http-method-override",
  "x-method-override",
  "x-middleware-subrequest",
]);
const FORBIDDEN_CUSTOM_HEADER_PREFIXES = [
  "x-forwarded-",
  "x-envoy-",
  "x-amzn-",
];

function isSupportedCustomHeader(property: string): boolean {
  const match = /^headers\.(x-[a-z0-9_-]+)$/i.exec(property);
  if (!match) {
    return false;
  }
  const name = match[1]!.toLowerCase();
  return (
    !FORBIDDEN_CUSTOM_HEADER_NAMES.has(name) &&
    !FORBIDDEN_CUSTOM_HEADER_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}

/**
 * The request properties a CasualOS proxy record can fill in: a property of
 * the JSON body, the `Authorization` header (as-is, or as a bearer token), or
 * a custom `x-` header such as `x-api-key`.
 */
export function isSupportedSensitiveRequestProperty(property: string): boolean {
  return (
    property === "headers.authorization" ||
    property === "headers.authorization.bearer" ||
    isSupportedCustomHeader(property) ||
    (property.startsWith("body.") && property.length > "body.".length)
  );
}

/** `host` or `host:port`, with no scheme, path or credentials. */
export function isValidSensitiveHost(host: string): boolean {
  return /^(?=.{1,253}(?::|$))[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?::\d{1,5})?$/i.test(
    host
  );
}

/**
 * The form hosts are compared in. Drops `:443`, because the URL parser drops
 * the default `https:` port too: `new URL("https://a.com:443/").host` is
 * `a.com`, so a host declared with it would otherwise never match a request.
 */
export function normalizeSensitiveHost(host: string): string {
  return host.trim().toLowerCase().replace(/:443$/, "");
}

/** True when the setting's value is held by a proxy rather than stored as a readable value. */
export function isSensitiveSetting(
  definition: ExtensionSettingDefinition | undefined
): boolean {
  return (
    definition?.type === "string" && typeof definition.sensitive === "string"
  );
}

/** The settings that hold an ordinary, readable value. */
export function nonSensitiveSettings(
  settings: Record<string, ExtensionSettingDefinition>
): Record<string, ExtensionSettingDefinition> {
  return Object.fromEntries(
    Object.entries(settings).filter(
      ([, definition]) => !isSensitiveSetting(definition)
    )
  );
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

/**
 * True when some finite number can satisfy the bounds and step together.
 * A step that isn't a positive finite number is ignored, matching
 * {@link settingValueSatisfiesDefinition}. A range with only one bound always
 * has room for a multiple.
 */
export function numberRangeAdmitsAValue(
  definition: ExtensionNumberSettingDefinition
): boolean {
  const minimum = finiteBound(definition.minimum);
  const maximum = finiteBound(definition.maximum);
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    return false;
  }
  const step = positiveStep(definition.multipleOf);
  if (step === undefined || minimum === undefined || maximum === undefined) {
    return true;
  }
  return alignToStep(minimum, step, "up") <= maximum;
}

/**
 * The nearest multiple of `step` at or beyond `bound`. Rounding uses
 * `toPrecision` rather than counting digits in `step.toString()`, because a
 * step like `1e-7` has no decimal point and `toFixed(0)` would turn the
 * bound into an integer.
 */
export function alignToStep(
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
  return Number(aligned.toPrecision(15));
}
