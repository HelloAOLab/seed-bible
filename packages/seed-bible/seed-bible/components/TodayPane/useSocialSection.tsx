import { useI18n } from "../../i18n";
import { useSignal, useSignalEffect } from "@preact/signals";
import type { SocialSectionUserProfile } from "./SocialSectionContext";
import { useState, useMemo, useCallback, useEffect } from "preact/hooks";
import {
  buildTimespanOptions,
  type FilteredReading,
  type Timespan,
} from "../../managers/TodayReadingHistory";
import type { LoginManager } from "../../managers/LoginManager";
import type { TodayManager } from "../../managers/TodayManager";
import { getUserAnimalVisual } from "../../managers/SessionsManager";

type UseSocialSection = (props: {
  today: TodayManager;
  login: LoginManager;
}) => {
  title: string;
  userProfileMap: Map<string, SocialSectionUserProfile>;
  userFilters: Map<string, boolean>;
  toggleUserFilter: (id: string) => void;
  year: number;
  timespan: Timespan | undefined;
  communityReading: FilteredReading;
  selectYear: (year: number) => void;
  selectDay: (timespan: Timespan | undefined) => void;
};

type UserProfile = {
  name: string;
  pictureUrl?: string | null | undefined;
  color: string;
  icon: string;
};
type UserProfileMap = Map<string, UserProfile>;

export const useSocialSection: UseSocialSection = ({ today, login }) => {
  const { getCommunityReading } = today;
  const userId = login.userId.value;
  const profile = login.profile.value;
  // The current user's own row in the filter list. Derived here rather than
  // passed in, so a profile change re-renders only this section.
  const userProfile = useMemo<UserProfile | undefined>(() => {
    if (!userId) return undefined;
    const visual = getUserAnimalVisual(userId);
    return {
      name: profile?.name ?? "Guest",
      pictureUrl: profile?.pictureUrl,
      color: visual.color,
      icon: visual.defaultIcon,
    };
  }, [userId, profile?.name, profile?.pictureUrl]);
  const { t } = useI18n();

  const initialOption = useMemo(() => buildTimespanOptions().twoDays, []);
  const year = useSignal<number>(initialOption.year);
  const timespan = useSignal<Timespan | undefined>(initialOption.timespan);
  const communityReading = useSignal<FilteredReading>({});

  const title = useMemo(
    () => t("community", { defaultValue: "COMMUNITY" }),
    [t]
  );

  const selectYear = useCallback((selectedYear: number) => {
    year.value = selectedYear;
    timespan.value = undefined;
  }, []);

  const selectDay = useCallback((selectedTimespan: Timespan | undefined) => {
    timespan.value = selectedTimespan;
  }, []);

  // Reactive data fetching: fetch the community reading for the exact selected
  // period. When `timespan` is undefined ("all"), clear it — no fetch.
  useSignalEffect(() => {
    const currentTimespan = timespan.value;
    if (!currentTimespan) {
      communityReading.value = {};
      return;
    }

    let cancelled = false;
    void getCommunityReading(currentTimespan).then((result) => {
      if (!cancelled) {
        communityReading.value = result;
      }
    });

    return () => {
      cancelled = true;
    };
  });

  const [userProfileMap, setUserProfileMap] = useState<UserProfileMap>(
    new Map()
  );

  useEffect(() => {
    if (userId && userProfile) {
      setUserProfileMap(new Map([[userId, userProfile]]));
    } else {
      setUserProfileMap(new Map());
    }
  }, [userId, userProfile]);

  const [userFilters, setUserFilters] = useState(() => {
    return new Map(
      [...userProfileMap.entries()].map(([id]) => {
        return [id, true];
      })
    );
  });

  useEffect(() => {
    setUserFilters((prev) => {
      const newMap = new Map(prev);
      for (const id of userProfileMap.keys()) {
        if (!newMap.has(id)) {
          newMap.set(id, true);
        }
      }
      for (const id of newMap.keys()) {
        if (!userProfileMap.has(id)) {
          newMap.delete(id);
        }
      }
      return newMap;
    });
  }, [userProfileMap]);

  const toggleUserFilter = useCallback(
    (id: string) => {
      setUserFilters((prev) => {
        prev.set(id, !prev.get(id));
        return new Map(prev);
      });
    },
    [setUserFilters]
  );

  return {
    title,
    userProfileMap,
    userFilters,
    toggleUserFilter,
    year: year.value,
    timespan: timespan.value,
    communityReading: communityReading.value,
    selectYear,
    selectDay,
  };
};
