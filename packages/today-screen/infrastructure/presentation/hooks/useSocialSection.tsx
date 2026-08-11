import { useTodayContext } from "../contexts/today/TodayContext";
import { useSignal, useSignalEffect } from "@preact/signals";
import type { FilteredReading } from "../../../domain/models/readingHistory";
import type { SocialSectionUserProfile } from "../contexts/socialSection/SocialSectionContext";
import { useState, useMemo, useCallback, useEffect } from "preact/hooks";
import type { Timespan } from "../../../domain/models/commonTypes";

type UseSocialSection = () => {
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

export const useSocialSection: UseSocialSection = () => {
  const {
    translate,
    subscribedUsersProfileProvider,
    subscribedUsersIdsProvider,
    getCommunityReading,
    readingHistoryConfigProvider,
    userId,
    userProfile,
  } = useTodayContext();

  const initialOption = useMemo(
    () => readingHistoryConfigProvider.buildTimespanOptionsMap().twoDays,
    []
  );
  const year = useSignal<number>(initialOption.year);
  const timespan = useSignal<Timespan | undefined>(initialOption.timespan);
  const communityReading = useSignal<FilteredReading>({});

  const title = useMemo(() => translate("community"), [translate]);

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
      const map: UserProfileMap = new Map([
        [userId, userProfile],
        ...subscribedUsersIdsProvider
          .getUsersIds()
          .map((id): [string, UserProfile] => [
            id,
            subscribedUsersProfileProvider.getUserProfile(id)!,
          ]),
      ]);
      setUserProfileMap(map);
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
