import type { AnimateTagFunctionOptions } from "../../../../pattern-typings/AuxLibraryDefinitions";
import type { TypedBot } from "../models/casualos";

export const SetStrictTag = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends TypedBot<any>,
  K extends keyof B["tags"],
>(
  bot: B | B[],
  tag: K,
  value: B["tags"][K]
) => {
  setTag(bot, tag as string, value);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ApplyStrictMod<B extends TypedBot<any>>(
  bot: B | undefined,
  mod: Partial<B["tags"]>
) {
  if (bot) applyMod(bot, mod);
}

// Overload 1: animate a single tag — animateTag(bot, tag, options).
export function AnimateStrictTag<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends TypedBot<any>,
  K extends keyof B["tags"],
>(
  bot: B | B[],
  tag: K,
  options: Omit<AnimateTagFunctionOptions, "fromValue" | "toValue"> & {
    fromValue?: B["tags"][K];
    toValue: B["tags"][K];
    ignoreCancellation?: boolean;
  }
): Promise<void>;
// Overload 2: animate several tags at once — animateTag(bot, options), where
// fromValue/toValue are objects of tag values.
export function AnimateStrictTag<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends TypedBot<any>,
>(
  bot: B | B[],
  options: Omit<AnimateTagFunctionOptions, "fromValue" | "toValue"> & {
    fromValue?: Partial<B["tags"]>;
    toValue: Partial<B["tags"]>;
    ignoreCancellation?: boolean;
  }
): Promise<void>;
export function AnimateStrictTag<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  B extends TypedBot<any>,
  K extends keyof B["tags"],
>(
  bot: B | B[],
  tagOrOptions:
    | K
    | (Omit<AnimateTagFunctionOptions, "fromValue" | "toValue"> & {
        fromValue?: Partial<B["tags"]>;
        toValue: Partial<B["tags"]>;
        ignoreCancellation?: boolean;
      }),
  options?: Omit<AnimateTagFunctionOptions, "fromValue" | "toValue"> & {
    fromValue?: B["tags"][K];
    toValue: B["tags"][K];
    ignoreCancellation?: boolean;
  }
): Promise<void> {
  // The native animateTag is poorly typed; the strict overloads above are the
  // contract callers see, so the implementation passes through.
  const optionsObject =
    typeof tagOrOptions === "object" ? tagOrOptions : options;
  const ignoreCancellation = optionsObject?.ignoreCancellation ?? false;

  const promise = animateTag(
    bot,
    tagOrOptions as string | AnimateTagFunctionOptions,
    options
  ) as Promise<void>;

  if (!ignoreCancellation) return promise;

  // Opt-in: treat a canceled animation (an unhighlight or a newer update
  // superseding an in-flight one) as a normal outcome instead of a rejection,
  // so it never aborts a caller that expects to coexist with such interruptions.
  return promise.catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("The animation was canceled")) {
      return;
    }
    throw error;
  });
}
