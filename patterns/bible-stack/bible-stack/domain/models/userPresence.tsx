import type { HexString } from "./commonTypes";
import * as z from "zod/v4";

export const StackPresenceNavigationPacings = {
  Regular: "Regular",
  Double: "Double",
} as const;

export type StackPresenceNavigationPacing =
  (typeof StackPresenceNavigationPacings)[keyof typeof StackPresenceNavigationPacings];

export const userProfileSchema = z.object({
  name: z.string().max(100),
  location: z.string().max(100).nullable().optional(),
  pictureUrl: z.url().max(1024).optional().nullable(),
  description: z.string().max(300).optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export interface UserPresenceData {
  bookId: string;
  chapter: number;
  readingInstanceId: string;
}

export type UserPresence = Map<string, UserPresenceData>;

export interface UserIds {
  configId?: string;
  authId?: string;
}

export interface UserData extends UserIds {
  color: HexString;
}

export interface ConnectedUserData extends UserIds {
  profile: UserProfile | undefined;
}
