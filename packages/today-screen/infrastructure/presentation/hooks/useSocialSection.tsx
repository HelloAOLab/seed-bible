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

  // Called during render on purpose: `getUsersIds()` reads the follow-list
  // signal, and reading a signal while rendering subscribes this component to
  // it. That's what makes following or unfollowing someone re-render the
  // section — a dependency array alone can't see a signal change, so the map
  // would otherwise stay stale until the section remounted.
  const subscribedUserIds = subscribedUsersIdsProvider.getUsersIds();
  // Key the memo on the ids themselves, not the array's identity. `userFilters`
  // below is derived from `userProfileMap` in an effect that always stores a new
  // Map, so a `userProfileMap` that changed identity on every render would
  // re-render → new array → new map → re-render, forever.
  const subscribedUsersKey = subscribedUserIds.join(",");

  const userProfileMap = useMemo<UserProfileMap>(() => {
    if (!userId || !userProfile) {
      return new Map();
    }
    const entries: [string, UserProfile][] = [[userId, userProfile]];
    for (const id of subscribedUserIds) {
      const profile = subscribedUsersProfileProvider.getUserProfile(id);
      // A followed account whose profile snapshot hasn't loaded yet is skipped
      // rather than rendered as a blank row.
      if (profile) {
        entries.push([id, profile]);
      }
    }
    return new Map(entries);
  }, [userId, userProfile, subscribedUsersKey]);

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
