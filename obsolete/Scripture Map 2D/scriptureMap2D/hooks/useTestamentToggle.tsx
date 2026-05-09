import { useTestamentContext } from "scriptureMap2D.contexts.Testament.TestamentContext";
const { useMemo } = os.appHooks;

type ArrowContent = "keyboard_arrow_up" | "keyboard_arrow_down";

interface UseTestamentToggleType {
  toggleDescriptionContent: string;
  toggleTitleContent: string;
  toggleArrowContent: ArrowContent;
}

type UseTestamentToggle = (params: {
  showingContent: boolean;
}) => UseTestamentToggleType;

export const useTestamentToggle: UseTestamentToggle = ({ showingContent }) => {
  const { testament } = useTestamentContext();

  const booksCount = useMemo(() => {
    const count = testament.sections.reduce((acc, section) => {
      return acc + section.books.length;
    }, 0);
    return count;
  }, [testament]);

  const toggleDescriptionContent = useMemo(() => {
    return `${booksCount} books`;
  }, [booksCount]);

  const toggleTitleContent = useMemo(() => {
    return testament.name;
  }, [testament]);

  const toggleArrowContent = useMemo<ArrowContent>(() => {
    return showingContent ? "keyboard_arrow_up" : "keyboard_arrow_down";
  }, [showingContent]);

  return {
    toggleDescriptionContent,
    toggleTitleContent,
    toggleArrowContent,
  };
};
