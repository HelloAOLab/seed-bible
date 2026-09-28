import type { ReadingInstance, UserPresence } from "../models/userPresence";

function isReadingInstance(value: unknown): value is ReadingInstance {
  if (typeof value !== "object" || value === null) return false;
  const instance = value as Record<string, unknown>;
  return (
    typeof instance.bookId === "string" &&
    typeof instance.chapter === "number" &&
    typeof instance.id === "string" &&
    typeof instance.selected === "boolean" &&
    typeof instance.translation === "string" &&
    typeof instance.connectionId === "string"
  );
}

export function ToUserPresence(value: unknown): UserPresence | null {
  if (!(value instanceof Map)) return null;
  const presence: UserPresence = new Map();
  for (const [connectionId, instances] of value) {
    if (typeof connectionId !== "string" || !Array.isArray(instances)) continue;
    const validInstances = instances.filter(isReadingInstance);
    if (validInstances.length > 0) presence.set(connectionId, validInstances);
  }
  return presence;
}
