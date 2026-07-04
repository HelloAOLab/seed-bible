import { useTestamentContext } from "../contexts/Testament/TestamentContext";
import { useScriptureMapContext } from "../contexts/ScriptureMap/ScriptureMapContext";
import { useMemo } from "preact/hooks";

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
  const { translate } = useScriptureMapContext();
  const { testament } = useTestamentContext();

  const booksCount = useMemo(() => {
    const count = testament.sections.reduce((acc, section) => {
      return acc + section.books.length;
    }, 0);
    return count;
  }, [testament]);

  const toggleDescriptionContent = useMemo(() => {
    return translate("books-count", { count: booksCount });
  }, [booksCount, translate]);

  const toggleTitleContent = useMemo(() => {
    return translate(testament.translationKey ?? testament.name);
  }, [testament, translate]);

  const toggleArrowContent = useMemo<ArrowContent>(() => {
    return showingContent ? "keyboard_arrow_up" : "keyboard_arrow_down";
  }, [showingContent]);

  return {
    toggleDescriptionContent,
    toggleTitleContent,
    toggleArrowContent,
  };
};
