const { useState, useEffect, useCallback } = os.appHooks;
const styles = tags["Reference.css"];
import { ThePageWithEditor } from "app.components.thePage";

const ReferenceModal = ({ reference }) => {
  const [referenceArray, setReferenceArray] = useState([]);
  const [rdLoading, setRdLoading] = useState(true);
  const [referenceData, setReferenceData] = useState({});
  const [showMore, setShowMore] = useState(false);

  const populateReferenceData = useCallback(async () => {
    setRdLoading(true);

    let referenceBot = getBot("system", "references.manager");

    const referenceArrayKey = `${reference.book}.${reference.chapter}.${reference.verse}`;
    if (
      referenceBot.masks?.referenceDataObject &&
      referenceBot.masks?.referenceDataObject[referenceArrayKey]
    ) {
      ull;

      console.log("retriveing from storage");
      setReferenceData({
        ...referenceBot.masks.referenceDataObject[referenceArrayKey],
      });
    } else {
      console.log("retriveing from web");
      const referenceDataPromises = referenceArray.map((reference) => {
        return web.get(
          `https://bible.helloao.org/api/BSB/${reference.book}/${reference.chapter}.json`
        );
      });

      const referenceReqs = await Promise.all(referenceDataPromises);

      let tempReferenceData = {};

      referenceReqs.forEach((res, index) => {
        if (res.status !== 200) {
          return;
        }
        const contentArray = [...res.data.chapter.content];
        let content = "";
        let reference = referenceArray[index];
        const referenceKey = `${reference.book}.${reference.chapter}.${reference.verse}`;
        let start = reference.verse;
        let end = reference?.endVerse || reference.verse;
        if (start <= end) {
          for (let i = start; i <= end; i++) {
            for (let j = 0; j < contentArray.length; j++) {
              if (contentArray[j]?.number == i) {
                let contentString = contentArray[j].content
                  .map((data) => {
                    if (typeof data === "string") {
                      return data;
                    } else if (data?.text) {
                      return data.text;
                    } else {
                      return "";
                    }
                  })
                  .join(" ");
                content += `${contentString} `;
                break;
              }
            }
          }
        }
        tempReferenceData[referenceKey] = { content };
      });
      setReferenceData({ ...tempReferenceData });
    }

    setRdLoading(false);
  }, [referenceArray]);

  const openChapter = async ({ reference }) => {
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
    let start = reference.verse;
    let end = reference?.endVerse || reference.verse;
    if (start <= end) {
      for (let i = start; i <= end; i++) {
        console.log(`highlighting verse ${i}`);
        HighlightVerse(i);
      }
    }
  };

  const handleTitleContext = async ({ e, reference }) => {
    e.stopPropagation();
    e.preventDefault();
    openChapter({ reference: reference });
    closePopupSettings();
  };

  useEffect(() => {
    populateReferenceData();
  }, [referenceArray]);

  useEffect(() => {
    setReferenceArray(
      showMore ? reference.references : reference.references.slice(0, 3)
    );
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
          boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
        }}
      >
        <div class="heading">
          <h2>{`${tags.IdToName[reference.book]} ${reference.chapter}:${reference.verse}`}</h2>
          <span
            onClick={() => {
              globalThis.currentReference !==
                `${reference.book}.${reference.chapter}.${reference.verse}` &&
                shout("ToggleReference", {
                  book: tags.IdToName[reference.book],
                  chapter: reference.chapter,
                  verse: reference.verse,
                });
              closePopupSettings();
            }}
            class="openTab material-symbols-outlined"
          >
            open_in_new
          </span>
        </div>

        {referenceArray.map((childReference) => {
          return (
            <div class="reference-components">
              <span
                onClick={(e) => {
                  handleTitleContext({ e, reference: childReference });
                }}
                class="reference-title"
              >{`${tags.IdToName[childReference.book]} ${childReference.chapter}:${childReference.verse}${childReference?.endVerse ? `-${childReference.endVerse}` : ""}`}</span>
              {rdLoading && <div class="loading-section"></div>}
              {!rdLoading &&
                referenceData[
                  `${childReference.book}.${childReference.chapter}.${childReference.verse}`
                ] && (
                  <div class="reference-content">
                    <span>
                      {
                        referenceData[
                          `${childReference.book}.${childReference.chapter}.${childReference.verse}`
                        ].content
                      }
                    </span>
                  </div>
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
    </>
  );
};

export default ReferenceModal;
