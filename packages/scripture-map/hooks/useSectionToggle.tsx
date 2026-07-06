import type { SectionInfo } from "../../seed-bible-utils/domain/models/arrangement";
import { useScriptureMapContext } from "../contexts/ScriptureMap/ScriptureMapContext";

import { useMemo } from "preact/hooks";

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
  const { translate } = useScriptureMapContext();

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
