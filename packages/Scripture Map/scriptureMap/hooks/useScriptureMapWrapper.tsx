import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
const { useMemo } = os.appHooks;

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
    scriptureMap3DConfigProvider,
  } = useScriptureMapContext();

  const style = useMemo<UseScriptureMapWrapperType["style"]>(() => {
    return {
      "--scale-factor": scaleFactor,
      "--book-width": `${bookWidth}px`,
      "--chapter-gap": `${chapterGap}px`,
      "--chapter-width": `${chapterWidth}px`,
      "--chapter-height": `${chapterHeight}px`,
      "--book-max-columns":
        scriptureMap3DConfigProvider.getBibleLayoutMeasurement(
          "Book2DMaxColumns"
        ),
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
