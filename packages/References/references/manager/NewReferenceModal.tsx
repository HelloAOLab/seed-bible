const { useState, useEffect, useCallback } = os.appHooks;
const styles = tags["Reference.css"];
import { ThePageWithEditor } from "app.components.thePage";
import type {
  ReferencesInterface,
  ReferenceInterface,
} from "references.manager.interfaces";
import { GetChapterContent } from "references.manager.GetReferences";

const ReferenceModal = (props: { reference: ReferencesInterface }) => {
  const { reference } = props;
  const [referenceArray, setReferenceArray] = useState<ReferenceInterface[]>(
    []
  );
  const [rdLoading, setRdLoading] = useState(true);
  const [referenceData, setReferenceData] = useState<{
    [key: string]: {
      content: string;
      references?: ReferenceInterface[];
      bookName: string;
    };
  }>({});
  const [showMore, setShowMore] = useState(false);

  const populateReferenceData = useCallback(async () => {
    setRdLoading(true);

    const referenceBot = getBot("system", "references.manager");

    const referenceArrayKey = `referenceDataObject-${reference.translation}.${reference.book}.${reference.chapter}.${reference.verse}`;
    if (referenceBot.masks?.[`${referenceArrayKey}`]) {
      console.log("retrieving from storage");
      setReferenceData({
        ...JSON.parse(referenceBot.masks[`${referenceArrayKey}`]),
      });
    } else {
      console.log("retriveing from web");
      const referenceDataPromises = referenceArray.map((subReference) => {
        return GetChapterContent({
          bookId: subReference.book,
          chapter: subReference.chapter,
          reference: subReference,
          baseUrl: reference.baseUrl,
          translation: reference.translation,
        });
      });

      const referenceReqs = await Promise.all(referenceDataPromises);

      const tempReferenceData: {
        [key: string]: {
          content: string;
          references?: ReferenceInterface[];
          bookName: string;
        };
      } = {};

      referenceReqs.forEach((res, index) => {
        if (!res) {
          return;
        }
        if (referenceArray[index]) {
          const reference: ReferenceInterface = referenceArray[index];
          const referenceKey = `${reference.book}.${reference.chapter}.${reference.verse}`;

          tempReferenceData[referenceKey] = {
            content: res.content,
            references: [],
            bookName: res.bookData.name,
          };
        }
      });
      setReferenceData({ ...tempReferenceData });
    }

    setRdLoading(false);
  }, [referenceArray]);

  const openChapter = async (props: { reference: ReferenceInterface }) => {
    const { reference } = props;
    const el = {
      id: uuid(),
      taken: false,
      data: {
        use: "thePage",
        type: "book",
        book: tags.IdToName[reference.book],
        bookId: reference.book,
        chapter: reference.chapter,
        translation: "BSB",
        shortName: "BSB",
      },
    };
    AddTab({
      ...el,
    });

    SetActiveTab(el.id);

    const checkEmpty = PanelsApps.find((e) => !e.tabData);
    const id = uuid();
    ReplaceApplication(checkEmpty.id, {
      id: id,
      App: <ThePageWithEditor tab={el} panelId={id} preferTab={true} />,
      to: "panel",
      minWidth: "30rem",
    });
    await os.sleep(2000);
    const start = reference.verse;
    const end = reference?.endVerse || reference.verse;
    if (start <= end) {
      for (let i = start; i <= end; i++) {
        console.log(`highlighting verse ${i}`);
        HighlightVerse(i, "#ffeb3b");
      }
    }
  };

  const handleTitleContext = async (props: {
    e: Event;
    reference: ReferenceInterface;
  }) => {
    const { e, reference } = props;
    e.stopPropagation();
    e.preventDefault();
    openChapter({ reference: reference });
    closePopupSettings();
  };

  useEffect(() => {
    populateReferenceData();
  }, [referenceArray]);

  useEffect(() => {
    if (!reference) return;
    if (showMore) {
      setReferenceArray(reference.references);
    } else {
      setReferenceArray(reference.references.slice(0, 3));
    }
  }, [reference, showMore]);

  return (
    <>
      <style>{styles}</style>
      <div
        class="reference-container"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
        style={{
          height: "400px",
          width: "250px",
          boxShadow:
            "color-mix(in srgb, var(--tabSelection) 20%, transparent) 0px 2px 8px 0px",
        }}
      >
        <div class="heading">
          <h2>{`${reference.bookName} ${reference.chapter}:${reference.verse}`}</h2>
          <span
            onClick={() => {
              if (
                globalThis.currentReference !==
                `${reference.book}.${reference.chapter}.${reference.verse}`
              ) {
                shout("ToggleReference", {
                  bookId: reference.book,
                  chapter: reference.chapter,
                  verse: reference.verse,
                  baseUrl: reference.baseUrl,
                  translation: reference.translation,
                  bookName: reference.bookName,
                });
              }
              closePopupSettings();
            }}
            class="openTab material-symbols-outlined"
          >
            open_in_new
          </span>
        </div>

        <div class="reference-body">
          {referenceArray.map((childReference) => {
            if (!childReference) return null;
            return (
              <div class="reference-components">
                {rdLoading && (
                  <>
                    <div
                      class="loading-section"
                      style={{ height: "1rem" }}
                    ></div>
                    <div class="loading-section"></div>
                  </>
                )}
                {!rdLoading &&
                  referenceData[
                    `${childReference.book}.${childReference.chapter}.${childReference.verse}`
                  ] && (
                    <>
                      <span
                        onClick={(e) => {
                          handleTitleContext({ e, reference: childReference });
                        }}
                        class="reference-title"
                      >{`${referenceData[`${childReference.book}.${childReference.chapter}.${childReference.verse}`]?.bookName} ${childReference.chapter}:${childReference.verse}${childReference?.endVerse ? `-${childReference.endVerse}` : ""}`}</span>
                      <div class="reference-content">
                        <span>
                          {
                            referenceData[
                              `${childReference.book}.${childReference.chapter}.${childReference.verse}`
                            ]?.content
                          }
                        </span>
                      </div>
                    </>
                  )}
              </div>
            );
          })}

          {reference.references.length > 3 && (
            <div
              class="reference-components"
              style="cursor: pointer; justify-content: center; align-items: center;"
            >
              <span
                onClick={() => {
                  setShowMore((prev) => !prev);
                }}
                class="material-symbols-outlined"
              >
                {showMore ? "keyboard_arrow_up" : "keyboard_arrow_down"}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReferenceModal;
