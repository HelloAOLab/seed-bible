import { Container } from "scriptureMap2D.main.Container";
import { Settings } from "scriptureMap2D.main.Settings";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Controls } from "scriptureMap2D.main.Controls";

export const Wrapper = () => {
  const {
    showLabels,
    bookWidth,
    chapterGap,
    chapterWidth,
    chapterHeight,
    scaleFactor,
    isMobile,
  } = useScriptureMap2DContext();

  return (
    <div
      className={`scripture-map-2d-wrapper${showLabels ? " showingLabels" : ""}`}
      style={{
        "--scale-factor": scaleFactor,
        "--book-width": `${bookWidth}px`,
        "--chapter-gap": `${chapterGap}px`,
        "--chapter-width": `${chapterWidth}px`,
        "--chapter-height": `${chapterHeight}px`,
        "--book-max-columns":
          BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book2DMaxColumns,
        paddingBottom: isMobile ? "40px" : "16px",
      }}
    >
      <Settings />
      <Container />
      <Controls />
    </div>
  );
};
