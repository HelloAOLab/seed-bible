import { signal, type Signal } from "@preact/signals";

export interface UserProfile {
  name: string;
}

export interface LoginManager {
  userId: Signal<string | null>;
  profile: Signal<UserProfile | null>;
  updateProfile: (newData: UserProfile) => void;
}

function getProfileName(bot: Bot): string | null {
  const candidates = [
    bot.tags?.name,
    bot.tags?.displayName,
    bot.tags?.username,
    bot.tags?.["user.name"],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

export function createLoginManager(): LoginManager {
  const userId = signal<string | null>(null);
  const profile = signal<UserProfile | null>(null);
  let authBot: Bot | null = null;

  const updateProfile = (newData: UserProfile) => {
    profile.value = {
      ...(profile.value ?? { name: "" }),
      ...newData,
    };

    if (authBot) {
      authBot.tags.name = profile.value.name;
    }
  };

  void os
    .requestAuthBotInBackground()
    .then((bot) => {
      if (!bot) {
        return;
      }

      authBot = bot;
      userId.value = bot.id;

      const name = getProfileName(bot);
      profile.value = name ? { name } : null;
    })
    .catch(() => {
      // Intentionally ignore background auth failures and keep anonymous state.
    });

  return {
    userId,
    profile,
    updateProfile,
  };
}
