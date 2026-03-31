import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
const { useMemo } = os.appHooks;

interface UseScriptureMap2DWrapperType {
  style: React.CSSProperties;
}

type UseScriptureMap2DWrapper = () => UseScriptureMap2DWrapperType;

export const useScriptureMap2DWrapper: UseScriptureMap2DWrapper = () => {
  const {
    bookWidth,
    chapterGap,
    chapterWidth,
    chapterHeight,
    scaleFactor,
    isMobile,
  } = useScriptureMap2DContext();

  const style = useMemo<UseScriptureMap2DWrapperType["style"]>(() => {
    return {
      "--scale-factor": scaleFactor,
      "--book-width": `${bookWidth}px`,
      "--chapter-gap": `${chapterGap}px`,
      "--chapter-width": `${chapterWidth}px`,
      "--chapter-height": `${chapterHeight}px`,
      "--book-max-columns":
        BibleVizDataRepository.getBibleLayoutMeasurement("Book2DMaxColumns"),
      paddingBottom: isMobile ? "40px" : "16px",
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
