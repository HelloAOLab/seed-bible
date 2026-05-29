import { useTodayContext } from "../contexts/today/TodayContext";

type UseHeader = () => {
  date: string;
  greeting: string;
  name: string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
};

const { useMemo } = os.appHooks;

export const useHeader: UseHeader = () => {
  const { language, username, MaterialIcon } = useTodayContext();

  const { day, month, greeting } = useMemo(() => {
    const date = new Date();
    const day = date.getDate();
    const month = date
      .toLocaleString(language, { month: "short" })
      .toUpperCase();
    const hour = date.getHours();
    const greeting =
      hour >= 5 && hour < 12
        ? "Good morning"
        : hour >= 12 && hour < 18
          ? "Good afternoon"
          : hour >= 18 && hour < 21
            ? "Good evening"
            : "Good night";
    return {
      day,
      month,
      greeting,
    };
  }, [language]);

  return {
    date: `${day} ${month}`,
    greeting,
    name: username && username.length > 0 ? username : "Guest",
    MaterialIcon,
  };
};
