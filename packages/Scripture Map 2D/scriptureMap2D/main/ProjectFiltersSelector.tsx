import { FiltersSelectorOption } from "scriptureMap2D.main.FiltersSelectorOption";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";

const { useSideBarContext } = await import("app.hooks.sideBar");

const { useMemo, useCallback } = os.appHooks;

export const ProjectFiltersSelector = () => {
  const { t } = useSideBarContext();
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
        title = t("stateAssigned");
        break;
      case ProjectChapterState.InProgress:
        title = t("stateInProgress");
        break;
      case ProjectChapterState.NeedsReview:
        title = t("stateNeedsReview");
        break;
      case ProjectChapterState.Completed:
        title = t("stateCompleted");
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
        className="filter-option-icon"
      ></div>,
      title,
    ];
  }, [t]);

  return (
    <div className="project-filters-selector">
      <FiltersSelectorOption
        content={t("all")}
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
