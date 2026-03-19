import { Container } from "scriptureMap2D.main.Container";
import { Settings } from "scriptureMap2D.main.Settings";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Controls } from "scriptureMap2D.main.Controls";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

export const Wrapper = () => {
  const {
    bookWidth,
    chapterGap,
    chapterWidth,
    chapterHeight,
    scaleFactor,
    isMobile,
  } = useScriptureMap2DContext();

  return (
    <div
      className="scripture-map-2d-wrapper"
      style={{
        "--scale-factor": scaleFactor,
        "--book-width": `${bookWidth}px`,
        "--chapter-gap": `${chapterGap}px`,
        "--chapter-width": `${chapterWidth}px`,
        "--chapter-height": `${chapterHeight}px`,
        "--book-max-columns": BibleVizDataRepository.getBibleLayoutMeasurement(
          "Book2DMaxColumns"
        ) as number,
        paddingBottom: isMobile ? "40px" : "16px",
      }}
    >
      <Settings />
      <Container />
      <Controls />
    </div>
  );
};
