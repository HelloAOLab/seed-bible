import type { SectionInfo } from "bibleVizUtils.domain.models.arrangement";
import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";

const { useMemo } = os.appHooks;

type ArrowContent = "keyboard_arrow_up" | "keyboard_arrow_down";

interface UseSectionToggleType {
  toggleTitleContent: string;
  toggleArrowContent: ArrowContent;
}

type UseSectionToggle = (params: {
  section: SectionInfo;
  showingContent: boolean | undefined;
}) => UseSectionToggleType;

export const useSectionToggle: UseSectionToggle = ({
  section,
  showingContent,
}) => {
  const { translate } = useScriptureMap2DContext();

  const toggleTitleContent = useMemo(() => {
    // console.log(`[Debug] useSectionToggle`, {
    //   section
    // })
    return translate(section.translationKey ?? section.name);
  }, [section, translate]);

  const toggleArrowContent = useMemo<ArrowContent>(() => {
    return showingContent ? "keyboard_arrow_up" : "keyboard_arrow_down";
  }, [showingContent]);

  return {
    toggleTitleContent,
    toggleArrowContent,
  };
};
