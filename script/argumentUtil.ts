/**
 * Cache of process arguments excluding the first two default entries.
 */
const argvCache: Array<string> = process.argv.slice(2);

/** The prefix expected to be used for long-form flags */
export const FLAG_PREFIX: "--" = "--" as const;
/** The prefix expected to be used for short-form flags */
export const SHORT_FLAG_PREFIX: "-" = "-" as const;

/**
 * Known argument flags (Flag Prefix format)
 * * These are the predefined known flags for the application and can be extended as needed.
 */
export enum KnownFlags {
  /** Whether or not to enable collaborative features (non-static insts) */
  Collaborative,

  /** Whether or not to start with dev tools open. */
  DevTools,

  /** Whether or not to load the Ao Bot inst. */
  AoBot,
}

/**
 * Known argument flags in their full / long format.
 */
export const KnownFlagsLong = {
  [KnownFlags.Collaborative]: "collaborative",
  [KnownFlags.DevTools]: "dev-tools",
  [KnownFlags.AoBot]: "ao-bot",
} as const satisfies Partial<Record<KnownFlags, string>>;

export type KnownFlagsLong = (typeof KnownFlagsLong)[KnownFlags];

/**
 * Known argument flags in their short format.
 */
export const KnownFlagsShort = {
  [KnownFlags.Collaborative]: "c",
  [KnownFlags.DevTools]: "d",
} as const satisfies Partial<Record<KnownFlags, string>>;

export type KnownFlagsShort =
  (typeof KnownFlagsShort)[keyof typeof KnownFlagsShort];

/**
 * Cache of present known flags in process arguments.
 */
const presentKnownFlags: Set<KnownFlagsLong | KnownFlagsShort> = new Set<
  KnownFlagsLong | KnownFlagsShort
>();

/**
 * Set of known flags for quick lookup.
 */
export const KnownFlagsSet: Set<KnownFlagsLong> = new Set(
  Object.values(KnownFlagsLong)
);
/**
 * Set of known short flags for quick lookup.
 */
export const KnownShortFlagsSet: Set<KnownFlagsShort> = new Set(
  Object.values(KnownFlagsShort)
);

/**
 * Populates the set of presentKnownFlags from process arguments (argvCache).
 */
for (const arg of argvCache) {
  if (arg.startsWith(FLAG_PREFIX) && arg.length > FLAG_PREFIX.length) {
    const flag = arg.slice(FLAG_PREFIX.length);
    if (KnownFlagsSet.has(flag as KnownFlagsLong)) {
      presentKnownFlags.add(flag as KnownFlagsLong);
    }
  } else if (
    arg.startsWith(SHORT_FLAG_PREFIX) &&
    arg.length > SHORT_FLAG_PREFIX.length
  ) {
    const shortFlag = arg.slice(SHORT_FLAG_PREFIX.length);
    if (KnownShortFlagsSet.has(shortFlag as KnownFlagsShort)) {
      presentKnownFlags.add(shortFlag as KnownFlagsShort);
    }
  }
}

/**
 * Known argument flag checker
 * * This function references only predefined known flags.
 * @param flag The known flag to check for.
 */
export function procHasFlag(flag: KnownFlags): boolean {
  const long = KnownFlagsLong[flag];

  // @ts-expect-error -- TypeScript can't infer that one of these will be defined
  const short = KnownFlagsShort[flag];
  if (long === undefined && short === undefined) {
    return false;
  }
  return presentKnownFlags.has(long) || presentKnownFlags.has(short);
}

/**
 * Arbitrary argument flag checker
 * @param search Object with 'flag' and/or 'shortFlag' to search for
 */
export function procHasFlagString(search: {
  flag?: string;
  shortFlag?: string;
}): boolean {
  return argvCache.some(
    (a) =>
      a === `${FLAG_PREFIX}${search?.flag}` ||
      a === `${SHORT_FLAG_PREFIX}${search?.shortFlag}`
  );
}
