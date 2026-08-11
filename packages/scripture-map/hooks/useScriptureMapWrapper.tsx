import { useScriptureMapContext } from "../contexts/ScriptureMap/ScriptureMapContext";
import { useMemo } from "preact/hooks";

interface UseScriptureMapWrapperType {
  style: React.CSSProperties;
}

type UseScriptureMapWrapper = () => UseScriptureMapWrapperType;

export const useScriptureMapWrapper: UseScriptureMapWrapper = () => {
  const {
    bookWidth,
    chapterGap,
    chapterWidth,
    chapterHeight,
    scaleFactor,
    isMobile,
    layoutConfigProvider,
  } = useScriptureMapContext();

  const style = useMemo<UseScriptureMapWrapperType["style"]>(() => {
    return {
      "--scale-factor": scaleFactor,
      "--book-width": `${bookWidth}px`,
      "--chapter-gap": `${chapterGap}px`,
      "--chapter-width": `${chapterWidth}px`,
      "--chapter-height": `${chapterHeight}px`,
      "--book-max-columns":
        layoutConfigProvider.getLayoutMeasurement("BookMaxColumns"),
      paddingBottom: isMobile ? "2.5rem" : "1rem",
    };
  }, [
    scaleFactor,
    bookWidth,
    chapterGap,
    chapterWidth,
    chapterHeight,
    isMobile,
  ]);

  return { style };
};
