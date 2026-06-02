import { useComputed } from "@preact/signals";
import { useTodayContext } from "../contexts/today/TodayContext";
import type {
  BookProps,
  UserIconData,
} from "../components/containers/FilteredReadingBook";

const { useMemo } = os.appHooks;

const MAX_ICONS = 7;

type UseFilteredReadingBook = (props: BookProps) => {
  name: string;
  chapter: number;
  usersIconData: UserIconData[];
  extraUsers: number | undefined;
};

export const useFilteredReadingBook: UseFilteredReadingBook = ({
  bookId,
  chapter,
  usersId,
}) => {
  const { bookNames, subscribedUsersProfileProvider, MaterialIcon } =
    useTodayContext();

  const name = useComputed(() => bookNames.value.get(bookId) ?? bookId);

  const { usersIconData, extraUsers } = useMemo<{
    usersIconData: UserIconData[];
    extraUsers: number | undefined;
  }>(() => {
    const iconsData: UserIconData[] = usersId.slice(0, MAX_ICONS).map((id) => {
      const profile = subscribedUsersProfileProvider.getUserProfile(id);
      if (!profile) {
        throw new Error(
          `useFilteredReadingBook: profile not found for id "${id}"`
        );
      }
      return {
        key: id,
        color: profile.color,
        icon: profile.icon,
        MaterialIcon,
      };
    });
    const extra = usersId.slice(MAX_ICONS).length;
    return {
      usersIconData: iconsData,
      extraUsers: extra > 0 ? extra : undefined,
    };
  }, [usersId]);

  return { name: name.value, chapter, usersIconData, extraUsers };
};
