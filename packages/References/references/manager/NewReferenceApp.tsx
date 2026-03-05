import ReferenceComponent from "references.manager.ReferenceComponent";
import { ThePageWithEditor } from "app.components.thePage";
import type {
  ReferencesInterface,
  ReferenceInterface,
} from "references.manager.interfaces";
import {
  GetReferences,
  GetChapterContent,
  CalculatePopupPosition,
} from "references.manager.GetReferences";

const { useState, useEffect, useCallback } = os.appHooks;
const styles = tags["Reference.css"];

const ReferenceApp = (props: { reference: ReferencesInterface }) => {
  const { reference } = props;
  const [currentReference, setCurrentReference] =
    useState<ReferencesInterface>(reference);
  const [rdLoading, setRdLoading] = useState(true);
  const [referenceData, setReferenceData] = useState<{
    [key: string]: {
      content: string;
      references?: ReferenceInterface[];
      bookName: string;
    };
  }>({});

  const populateReferenceData = useCallback(async () => {
    setRdLoading(true);

    const referenceBot = getBot("system", "references.manager");

    const referenceArrayKey = `referenceDataObject-${currentReference.translation}.${currentReference.book}.${currentReference.chapter}.${currentReference.verse}`;
    if (referenceBot.masks?.[`${referenceArrayKey}`]) {
      console.log("retrieving from storage");
      setReferenceData({
        ...JSON.parse(referenceBot.masks[`${referenceArrayKey}`]),
      });
    } else if (currentReference) {
      console.log("retriveing from web");
      const referenceDataPromises = currentReference.references.map(
        (reference) => {
          return GetChapterContent({
            bookId: reference.book,
            chapter: reference.chapter,
            reference: reference,
            baseUrl: currentReference.baseUrl,
            translation: currentReference.translation,
          });
        }
      );

      const referenceReqs = await Promise.all(referenceDataPromises);

      const tempReferenceData: {
        [key: string]: {
          content: string;
          references?: ReferenceInterface[];
          bookName: string;
        };
      } = {};

      const subReferences: Promise<ReferencesInterface>[] = [];

      referenceReqs.forEach((res, index) => {
        if (!res) {
          return;
        }
        if (currentReference.references[index]) {
          const reference: ReferenceInterface =
            currentReference.references[index];
          const referenceKey = `${reference.book}.${reference.chapter}.${reference.verse}`;
          tempReferenceData[referenceKey] = {
            content: res.content || "",
            references: [],
            bookName: res?.bookData?.name || "",
          };
          subReferences.push(
            GetReferences({
              bookId: reference.book,
              chapter: reference.chapter,
              verse: reference.verse,
              baseUrl: currentReference.baseUrl,
              translation: currentReference.translation,
              bookName: res?.bookData?.name || "",
            })
          );
        }
      });

      const subReferencesRes = await Promise.all(subReferences);

      subReferencesRes.forEach((res, index) => {
        if (currentReference.references[index]) {
          const reference: ReferenceInterface =
            currentReference.references[index];
          const referenceKey = `${reference.book}.${reference.chapter}.${reference.verse}`;
          if (!res) {
            return;
          }
          if (tempReferenceData[referenceKey]) {
            tempReferenceData[referenceKey] = {
              content: tempReferenceData[referenceKey].content || "",
              references: [...res.references.slice(0, 5)],
              bookName: tempReferenceData[referenceKey].bookName || "",
            };
          }
        }
      });
      setReferenceData({ ...tempReferenceData });
    }

    setRdLoading(false);
  }, [currentReference]);

  const updateReferences = async (props: {
    reference: ReferenceInterface;
    baseUrl: string;
    translation: string;
  }) => {
    const { reference, baseUrl, translation } = props;
    const newReference = await GetReferences({
      bookId: reference.book,
      chapter: reference.chapter,
      verse: reference.verse,
      baseUrl: baseUrl,
      translation: translation,
      bookName: reference.bookName,
    });
    setCurrentReference(newReference);
  };

  const handleRedirect = useCallback(
    async (props: { reference: ReferenceInterface }) => {
      const { reference } = props;
      updateReferences({
        reference,
        baseUrl: currentReference.baseUrl,
        translation: currentReference.translation,
      });
      openChapter({ reference });
    },
    []
  );

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
        translation: currentReference.translation,
      },
    };
    AddTab({
      ...el,
    });

    SetActiveTab(el.id);

    const checkEmpty = PanelsApps.find((e: any) => !e.tabData);
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

  const showVerse = async (props: {
    reference: ReferenceInterface;
    mouseEvent: MouseEvent;
    baseUrl: string;
    translation: string;
  }) => {
    const { reference, mouseEvent } = props;
    closePopupSettings();
    await os.sleep(100);
    const position = CalculatePopupPosition(mouseEvent, 250, 170);
    openPopupSettings(
      <ReferenceComponent
        reference={reference}
        handleRedirect={handleRedirect}
        baseUrl={props.baseUrl}
        translation={props.translation}
      />,
      null,
      true,
      position
    );
  };

  useEffect(() => {
    globalThis.SetCurrentReference = setCurrentReference;
    if (currentReference) {
      populateReferenceData();
      globalThis.currentReferenceKey = `${currentReference.book}.${currentReference.chapter}.${currentReference.verse}`;
    }
    return () => {
      globalThis.SetCurrentReference = null;
      globalThis.currentReferenceKey = null;
    };
  }, [currentReference]);

  return (
    <>
      <style>{styles}</style>
      <div
        class="reference-container"
        onContextMenu={(e) => e.stopPropagation()}
        onScroll={() => {
          closePopupSettings();
        }}
      >
        <div class="heading">
          <h2>{`${currentReference?.bookName} ${currentReference?.chapter}:${currentReference?.verse}`}</h2>
          <span
            onClick={() => {
              const panelKey = `reference_PANEL_ID`;

              if (globalThis.makingApp === "reference") {
                RemoveApplicationByID(globalThis[panelKey]);
                globalThis[panelKey] = null;
                globalThis.makingApp = null;
                globalThis.currentReference = null;
                return;
              }
            }}
            style={{ cursor: "pointer" }}
            class="material-symbols-outlined"
          >
            close
          </span>
        </div>
        {currentReference?.references.map((childReference) => {
          if (!childReference) return null;
          return (
            <div
              class="reference-components"
              style={
                rdLoading
                  ? {}
                  : referenceData[
                        `${childReference.book}.${childReference.chapter}.${childReference.verse}`
                      ]
                    ? {}
                    : { display: "none" }
              }
            >
              {rdLoading && (
                <>
                  <div class="loading-section" style={{ height: "1rem" }}></div>
                  <div class="loading-section"></div>
                </>
              )}
              {!rdLoading &&
                referenceData[
                  `${childReference.book}.${childReference.chapter}.${childReference.verse}`
                ] && (
                  <>
                    <span
                      onClick={() =>
                        handleRedirect({
                          reference: childReference,
                        })
                      }
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
                      {referenceData[
                        `${childReference.book}.${childReference.chapter}.${childReference.verse}`
                      ]?.references?.map((subRef) => {
                        return (
                          <span
                            onClick={(e) => {
                              if (masks?.showVerse) {
                                clearTimeout(masks.showVerse);
                              }
                              showVerse({
                                reference: subRef,
                                mouseEvent: e,
                                baseUrl: currentReference.baseUrl,
                                translation: currentReference.translation,
                              });
                            }}
                            onMouseEnter={(e) => {
                              if (masks?.showVerse) {
                                clearTimeout(masks.showVerse);
                              } else {
                                const showVerseTimeout = setTimeout(() => {
                                  showVerse({
                                    reference: subRef,
                                    mouseEvent: e,
                                    baseUrl: currentReference.baseUrl,
                                    translation: currentReference.translation,
                                  });
                                }, 500);
                                setTagMask(
                                  thisBot,
                                  `showVerse`,
                                  showVerseTimeout,
                                  "local"
                                );
                              }
                            }}
                            onMouseLeave={() => {
                              if (masks?.showVerse) {
                                clearTimeout(masks.showVerse);
                                setTagMask(thisBot, `showVerse`, null, "local");
                              }
                            }}
                            class="subRef"
                          >{`(${subRef.book} ${subRef.chapter}:${subRef.verse}) `}</span>
                        );
                      })}
                    </div>
                  </>
                )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ReferenceApp;
