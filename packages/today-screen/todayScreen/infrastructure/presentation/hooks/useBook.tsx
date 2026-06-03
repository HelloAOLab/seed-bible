import { useComputed } from "@preact/signals";
import { useTodayContext } from "../contexts/today/TodayContext";
import type {
  BookProps,
  UserIconData,
  ChapterData,
} from "../components/containers/Book";
import { useState } from "preact/hooks";

const { useMemo, useCallback } = os.appHooks;

const MAX_ICONS = 7;

type UseBook = (props: BookProps) => {
  name: string;
  // chapter: number;
  usersIconData: UserIconData[];
  extraUsers: number | undefined;
  isExpanded: boolean;
  handleBookClick: () => void;
  chaptersData: ChapterData[];
};

export const useBook: UseBook = ({
  bookId,
  // chapter,
  chaptersReading,
  usersId,
}) => {
  const {
    bookNames,
    subscribedUsersProfileProvider,
    MaterialIcon,
    translationBooksMap,
  } = useTodayContext();

  const [isExpanded, setIsExpanded] = useState(false);
  const handleBookClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);
  const name = useComputed(() => bookNames.value.get(bookId) ?? bookId);

  const { usersIconData, extraUsers, chaptersData } = useMemo<{
    usersIconData: UserIconData[];
    extraUsers: number | undefined;
    chaptersData: ChapterData[];
  }>(() => {
    const iconsDataMap = new Map(
      usersId.slice(0, MAX_ICONS).map((id) => {
        const profile = subscribedUsersProfileProvider.getUserProfile(id);
        if (!profile) {
          throw new Error(`useBook: profile not found for id "${id}"`);
        }
        return [
          id,
          {
            key: id,
            MaterialIcon,
            ...profile,
            pictureUrl: profile.pictureUrl ?? undefined,
          },
        ];
      })
    );
    const extra = usersId.slice(MAX_ICONS).length;
    const usersIconData: UserIconData[] = [...iconsDataMap.values()].map(
      (data) => {
        const { key, MaterialIcon, pictureUrl, color, icon } = data;

        return {
          key,
          MaterialIcon,
          pictureUrl,
          color,
          icon,
        };
      }
    );

    const blankChapters = Array.from({
      length: translationBooksMap.value.get(bookId)?.numberOfChapters ?? 0,
    });
    const chaptersData: ChapterData[] = blankChapters.map((_, index) => {
      const chapter = index + 1;
      const usersData =
        chaptersReading[chapter]?.map((id) => {
          const iconData = iconsDataMap.get(id);
          if (!iconData) {
            throw new Error(`useBook: iconData not found.`);
          }
          return iconData;
        }) ?? [];
      return {
        key: String(chapter),
        number: chapter,
        usersData,
      };
    });

    return {
      usersIconData,
      extraUsers: extra > 0 ? extra : undefined,
      chaptersData,
    };
  }, [usersId]);

  return {
    name: name.value,
    /*chapter, */ usersIconData,
    extraUsers,
    isExpanded,
    handleBookClick,
    chaptersData,
  };
};
