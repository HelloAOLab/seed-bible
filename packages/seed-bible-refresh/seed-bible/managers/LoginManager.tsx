import { computed, effect, signal, type Signal } from "@preact/signals";
import { z } from "zod";

export interface LoginManager {
  /**
   * The ID of the user. Null if the user is not authenticated.
   */
  userId: Signal<string | null>;

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
  updateProfile: (newData: UserProfile) => void;
}

const userProfileSchema = z.object({
  name: z.string().min(1),
});

type UserProfile = z.infer<typeof userProfileSchema>;

export function createLoginManager(): LoginManager {
  const authBot: Signal<Bot | null> = signal<Bot | null>(null);
  const userId = computed(() => authBot.value?.id ?? null);
  const profile = signal<UserProfile | null>(null);

  const getUserProfile = async (userId: string): Promise<UserProfile> => {
    const data = await os.getData(userId, "profile");

    if (!data) {
      console.log("[LoginManager] No profile data found for user:", userId);
      // Return a default profile
      return {
        name: "",
      };
    }

    const parsed = userProfileSchema.safeParse(data);

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

    getUserProfile(userId.value).then((p) => {
      profile.value = p;
    });
  });

  const updateProfile = (newData: UserProfile) => {
    if (!userId.value) {
      console.warn("Cannot update profile: no authenticated user");
      return;
    }
    profile.value = {
      ...(profile.value ?? { name: "" }),
      ...newData,
    };

    updateUserProfile(userId.value, profile.value);
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
    profile,
    login,
    logout,
    updateProfile,
  };
}
