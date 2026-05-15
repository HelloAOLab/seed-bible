import { computed, effect, signal, type Signal } from "@preact/signals";
import { z } from "zod";
import type { CasualOSManager, UserInfo } from "./OsManager";

export interface LoginManager {
  /**
   * The ID of the user. Null if the user is not authenticated.
   */
  userId: Signal<string | null>;

  /**
   * The current auth bot. Null if not authenticated or if background auth has not completed yet.
   */
  authBot: Signal<UserInfo | null>;

  /**
   * The user's profile information. Null if the user is not logged in.
   */
  profile: Signal<UserProfile | null>;

  /**
   * Attempts to login the user.
   */
  login: () => Promise<void>;

  /**
   * Attempts to log out the user.
   */
  logout: () => Promise<void>;

  /**
   * Updates the user's profile information.
   */
  updateProfile: (newData: Partial<UserProfile>) => void;

  /**
   * Gets the user's profile information from storage.
   * @param userId The ID of the user to get the profile for.
   * @returns A promise that resolves with the profile information for the user.
   */
  getUserProfile: (userId: string) => Promise<UserProfile>;

  /**
   * Prompts the user to upload a profile picture, stores it as a public file
   * record, and saves the resulting URL to the user's profile.
   * Resolves without changes if no file is selected or the user is not authenticated.
   */
  uploadProfilePicture: () => Promise<void>;
}

export const userProfileSchema = z.object({
  name: z.string().max(100),
  location: z.string().max(100).nullable().optional(),
  pictureUrl: z.url().max(1024).optional().nullable(),
  description: z.string().max(300).optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export function createLoginManager({
  os,
}: {
  os: CasualOSManager;
}): LoginManager {
  const authBot: Signal<UserInfo | null> = signal<UserInfo | null>(null);
  const userId = computed(() => authBot.value?.id ?? null);
  const profile = signal<UserProfile | null>(null);

  const getUserProfile = async (userId: string): Promise<UserProfile> => {
    const data = await os.getData(userId, "profile");

    if (!data.success) {
      console.log("[LoginManager] No profile data found for user:", userId);
      // Return a default profile
      return {
        name: "",
      };
    }

    const parsed = userProfileSchema.safeParse(data.data);

    if (!parsed.success) {
      console.warn("Failed to parse user profile data:", parsed.error);
      // Return a default profile
      return {
        name: "",
      };
    }
    return parsed.data;
  };

  const updateUserProfile = async (
    userId: string,
    profile: UserProfile
  ): Promise<void> => {
    await os.recordData(userId, "profile", profile, {
      marker: "publicRead",
    });
  };

  const login = async (): Promise<void> => {
    try {
      const bot = await os.requestAuthBot();
      authBot.value = bot;
    } catch (err) {
      console.error("Authentication failed:", err);
    }
  };

  const logout = async (): Promise<void> => {
    await os.signOut();
    authBot.value = null;
  };

  effect(() => {
    if (!userId.value) {
      profile.value = null;
      return;
    }

    if (typeof posthog !== "undefined" && posthog) {
      console.log(
        "[LoginManager] Identifying PostHog with auth bot ID:",
        authBot
      );
      posthog.identify(userId.value);
    }

    getUserProfile(userId.value).then((p) => {
      profile.value = p;
    });
  });

  const updateProfile = (newData: Partial<UserProfile>) => {
    if (!userId.value) {
      console.warn("Cannot update profile: no authenticated user");
      return;
    }

    const nextProfile: UserProfile = {
      ...(profile.value ?? { name: "" }),
      ...newData,
    };
    profile.value = nextProfile;

    updateUserProfile(userId.value, nextProfile);
  };

  const uploadProfilePicture = async (): Promise<void> => {
    // TODO: Implement this
    // if (!userId.value) {
    //   console.warn("Cannot upload profile picture: no authenticated user");
    //   return;
    // }
    // const files = await os.showUploadFiles();
    // const file = files?.[0];
    // if (!file) {
    //   throw new Error("No file selected for upload");
    // }
    // const result = await os.recordFile(userId.value, file.data, {
    //   mimeType: file.mimeType,
    //   markers: ["publicRead"],
    // });
    // if (result.success === false) {
    //   console.error("Profile picture upload failed:", result);
    //   throw new Error("Failed to upload profile picture");
    // }
    // updateProfile({ pictureUrl: result.url });
  };

  void os
    .requestAuthBotInBackground()
    .then((bot) => {
      if (!bot) {
        return;
      }

      authBot.value = bot;
    })
    .catch(() => {
      // Intentionally ignore background auth failures and keep anonymous state.
    });

  return {
    userId,
    authBot,
    profile,
    login,
    logout,
    updateProfile,
    getUserProfile,
    uploadProfilePicture,
  };
}
