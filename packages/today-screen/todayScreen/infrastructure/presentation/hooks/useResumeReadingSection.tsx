import { useTodayContext } from "../contexts/today/TodayContext";

type UseResumeReadingSection = () => {
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
};

export const useResumeReadingSection: UseResumeReadingSection = () => {
  const { MaterialIcon } = useTodayContext();

  return {
    MaterialIcon,
  };
};
