import { FiltersSelectorOption } from "scriptureMap2D.main.FiltersSelectorOption";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";

const { useMemo, useCallback } = os.appHooks;

export const ProjectFiltersSelector = () => {
  const {
    projectFilters,
    handleProjectFilterOptionClick,
    ProjectChapterState,
    projectStateStyle,
  } = useScriptureMap2DContext();

  const allSelected = useMemo(() => {
    return Array.from(projectFilters).every(([, value]) => {
      return value;
    });
  }, [projectFilters]);

  const getOptionContent = useCallback((key) => {
    let title;

    switch (key) {
      case ProjectChapterState.Assigned:
        title = "Assigned";
        break;
      case ProjectChapterState.InProgress:
        title = "In Progress";
        break;
      case ProjectChapterState.NeedsReview:
        title = "Needs Review";
        break;
      case ProjectChapterState.Completed:
        title = "Completed";
        break;
      default:
        throw new Error("Not found key", { key });
    }

    const style = projectStateStyle[key];

    return [
      <div
        style={{
          backgroundColor: style.backgroundColor,
          borderStyle: style.borderStyle,
          borderColor: style.borderColor,
        }}
        className="filterOptionIcon"
      ></div>,
      title,
    ];
  }, []);

  return (
    <div className="projectFiltersSelector">
      <FiltersSelectorOption
        content="All"
        onClick={() => {
          handleProjectFilterOptionClick("all");
        }}
        selected={allSelected}
      />
      {Array.from(projectFilters).map(([key, value]) => {
        return (
          <FiltersSelectorOption
            content={getOptionContent(key)}
            onClick={() => {
              handleProjectFilterOptionClick(key);
            }}
            selected={allSelected ? false : value}
          />
        );
      })}
    </div>
  );
};
