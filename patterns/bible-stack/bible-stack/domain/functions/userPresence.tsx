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
  for (const [connectionId, instances] of value) {
    if (typeof connectionId !== "string") return null;
    if (!Array.isArray(instances)) return null;
    if (!instances.every(isReadingInstance)) return null;
  }
  return value as UserPresence;
}
