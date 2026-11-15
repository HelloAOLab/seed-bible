/**
 * The value with surrounding whitespace removed, or null when nothing is left.
 *
 * For anywhere a blank string should behave the same as a missing one. A
 * profile name that arrives as "" or "   " renders as an empty label, which
 * tells a reader less than a fallback does; returning null rather than "" lets
 * the caller reach for `??` and pick its own fallback.
 */
export function trimmedOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/**
 * English names for the animal-avatar Material icons. Used as `defaultValue`
 * when a locale hasn't translated `animal-*` yet — keep in sync with
 * `USER_ANIMAL_ICONS` in SessionsManager and the `animal-*` keys in en.json.
 */
const ENGLISH_ANIMAL_LABELS: Record<string, string> = {
  forest: "Forest",
  park: "Log",
  eco: "Leaf",
  pets: "Dog",
  cruelty_free: "Rabbit",
  local_cafe: "Coffee",
  local_florist: "Flower",
  grass: "Grass",
  potted_plant: "Plant",
  nature: "Tree",
};

function titleCaseWord(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * Default label for someone who never set a profile name: the Color + Icon of
 * their animal avatar, e.g. "Red Forest (Anonymous)". Shared by session
 * participants, chat, and anywhere else that avatar is the only identity.
 *
 * `visual` is only the color/icon names — callers pass whatever key they used
 * for the avatar (`connectionId` in a session, `userId` on a profile card) so
 * the label always matches the picture beside it.
 */
export function visualAnonymousLabel(
  visual: { colorName: string; defaultIcon: string },
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  return t("visual-color-animal-anonymous", {
    defaultValue: "{{color}} {{animal}} (Anonymous)",
    color: t(`color-${visual.colorName}`, {
      defaultValue: titleCaseWord(visual.colorName),
    }),
    animal: t(`animal-${visual.defaultIcon}`, {
      defaultValue:
        ENGLISH_ANIMAL_LABELS[visual.defaultIcon] ?? visual.defaultIcon,
    }),
  });
}

/**
 * What to call someone: their profile name, or "User 1a2b3c4d" (the start of
 * their user ID) when they never set one.
 *
 * Prefer {@link visualAnonymousLabel} when an avatar visual is on hand (session
 * lists, profile cards): the Color + Icon matches the picture and reads as a
 * real name. This User-ID fallback stays for places that only have an account
 * id (friend toasts, add-by-id), where inventing an animal would disagree with
 * a session that keys the avatar off a connection id.
 */
export function displayNameOf(
  person: { userId: string; name?: string | null },
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  return (
    trimmedOrNull(person.name) ??
    t("unnamed-user", {
      id: person.userId.slice(0, 8),
      defaultValue: "User {{id}}",
    })
  );
}

export function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * True on Apple platforms, where shortcuts use Cmd instead of Ctrl (TipTap's
 * `Mod` key follows the same rule).
 */
export function isApplePlatform(): boolean {
  return typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
}

/** Sends a PostHog event, no-op when `posthog` isn't present (SSR, tests). */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (typeof posthog === "undefined" || !posthog) {
    return;
  }
  posthog.capture(eventName, properties);
}
