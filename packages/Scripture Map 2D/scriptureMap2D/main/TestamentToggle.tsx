import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import type { TestamentToggleType } from "scriptureMap2D.main.types";
const { useMemo } = os.appHooks;

export const TestamentToggle: TestamentToggleType = ({
  toggleshowContent,
  showingContent,
}) => {
  const { testament } = useTestamentContext();

  // const fixedTestamentColor = useMemo(() => {
  //     return testament.color ?? "#000000"
  // }, [])

  // const textColor = useMemo(() => {
  //     return GetTextColorBasedOnBackground(fixedTestamentColor)
  // }, [])

  const booksCount = useMemo(() => {
    const count = testament.sections.reduce((acc, section) => {
      return acc + section.books.length;
    }, 0);
    return count;
  }, [testament]);

  return (
    <div className="toggle toggle-testament" onClick={toggleshowContent}>
      <span className="toggle-title">{testament.name}</span>
      <span className="toggle-description">{`${booksCount} books`}</span>
      <span className="material-symbols-outlined toggle-arrow">
        {showingContent ? "keyboard_arrow_up" : "keyboard_arrow_down"}
      </span>
    </div>
  );
};
