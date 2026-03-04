import { useTestamentContext } from "managers.MapsManager.TestamentContext";
import { useMapPanelContext } from "managers.MapsManager.MapPanelContext";
import { Book } from "managers.MapsManager.BookComponent";
const { useMemo, useCallback, useState, useEffect, useRef } = os.appHooks;

export const TestamentContent = ({ hidden }) => {
  let sectionLevelsColorsMapRef = useRef(new Map());
  const { testament, testamentIndex } = useTestamentContext();
  const { arrangementRef, arrangementIndexRef } = useMapPanelContext();
  const { mapBooksInfo } = useMemo(() => {
    return thisBot.GetMapStructure({
      arrangementIndex: arrangementIndexRef.current,
      arrangement: arrangementRef.current,
    });
  }, []);
  const reversedSections = useMemo(() => {
    return testament.sections.toReversed();
  });
  const [sectionsShownArray, setSectionsShownArray] = useState(
    reversedSections.map((_, index) => {
      return true;
    })
  );
  const toggleShowSection = useCallback(
    (section) => {
      const copy = [...sectionsShownArray];
      const index = reversedSections.indexOf(section);
      copy[index] = !copy[index];
      setSectionsShownArray(copy);
    },
    [testament, sectionsShownArray]
  );

  return (
    <div className={`testamentContent ${hidden ? "hidden" : ""}`}>
      {reversedSections.flatMap((section, sectionIndex) => {
        const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
        if (!sectionLevelsColorsMapRef.current.has(levelColorsKey)) {
          const sectionLevelsColors = GetChildrenLevelColors({
            sectionColorRGB: HexToRgb(section.color),
            colorRange: section.customColorRange ?? 70,
            levelsLength: section.books.length,
          });
          sectionLevelsColorsMapRef.current.set(
            levelColorsKey,
            sectionLevelsColors
          );
        }
        const isLastSectionInTestament =
          sectionIndex == reversedSections.length - 1;
        const isFirstSectionInTestament = sectionIndex == 0;

        return section.books.toReversed().map((_, bookIndex) => {
          const mapPanelBookInfo = mapBooksInfo.find((info) => {
            return (
              info.arrangementIndex == arrangementIndexRef.current &&
              info.testamentIndex == testamentIndex &&
              info.sectionIndex == sectionIndex &&
              info.bookIndex == bookIndex
            );
          });

          const isFirstBookInSection = useMemo(() => {
            return bookIndex == 0;
          }, []);

          const color =
            mapPanelBookInfo.color ??
            sectionLevelsColorsMapRef.current.get(levelColorsKey).toReversed()[
              bookIndex
            ];

          return (
            <Book
              hidden={
                !isFirstBookInSection && !sectionsShownArray[sectionIndex]
              }
              showingSection={sectionsShownArray[sectionIndex]}
              section={section}
              mapPanelBookInfo={mapPanelBookInfo}
              bookIndex={bookIndex}
              isLastSectionInTestament={isLastSectionInTestament}
              isFirstSectionInTestament={isFirstSectionInTestament}
              bookCoverBackgroundColor={color}
              toggleShowSection={toggleShowSection}
              isFirstBookInSection={isFirstBookInSection}
            />
          );
        });
      })}
    </div>
  );
};
