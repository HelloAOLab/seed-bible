import type {
  ConnectedUserData,
  ReadingInstance,
  UserIdentityMap,
  UserPresence,
} from "../models/userPresence";

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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function ToUserPresence(value: unknown): UserPresence | null {
  if (!isPlainRecord(value)) return null;
  const presence: UserPresence = new Map();
  for (const [connectionId, instances] of Object.entries(value)) {
    if (!Array.isArray(instances)) continue;
    const validInstances = instances.filter(isReadingInstance);
    if (validInstances.length > 0) presence.set(connectionId, validInstances);
  }
  return presence;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isConnectedUserData(value: unknown): value is ConnectedUserData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  const visual = data.visual as Record<string, unknown> | null | undefined;
  return (
    typeof visual === "object" &&
    visual !== null &&
    typeof visual.defaultIcon === "string" &&
    typeof visual.color === "string" &&
    typeof visual.colorName === "string" &&
    isOptionalString(data.connectionId) &&
    isOptionalString(data.userId) &&
    (data.profile === undefined ||
      (typeof data.profile === "object" && data.profile !== null))
  );
}

export function ToUserIdentityMap(value: unknown): UserIdentityMap | null {
  if (!isPlainRecord(value)) return null;
  const identity: UserIdentityMap = new Map();
  for (const [connectionId, data] of Object.entries(value)) {
    if (isConnectedUserData(data)) identity.set(connectionId, data);
  }
  return identity;
}
