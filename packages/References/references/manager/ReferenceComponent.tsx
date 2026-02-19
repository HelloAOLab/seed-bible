import type { ReferenceInterface } from "references.manager.interfaces";
const { useState, useEffect, useCallback } = os.appHooks;
const styles = tags["Reference.css"];

const ReferenceComponent = (props: {
  reference: ReferenceInterface;
  handleRedirect: (props: { reference: ReferenceInterface }) => void;
}) => {
  const { reference, handleRedirect } = props;
  const [rdLoading, setRdLoading] = useState(true);
  const [rfContent, setRFContent] = useState("");

  const loadContent = useCallback(
    async (props: { reference: ReferenceInterface }) => {
      const { reference } = props;
      setRdLoading(true);
      const contentReq = await web.get(
        `https://bible.helloao.org/api/BSB/${reference.book}/${reference.chapter}.json`
      );
      if (contentReq.status == 200) {
        const contentArray = [...contentReq.data.chapter.content];
        let content = "";
        const start = reference.verse;
        const end = reference?.endVerse || reference.verse;
        if (start <= end) {
          for (let i = start; i <= end; i++) {
            for (let j = 0; j < contentArray.length; j++) {
              if (contentArray[j]?.number == i) {
                const contentString = contentArray[j].content
                  .map((data: any) => {
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
        setRFContent(content);
      }
      setRdLoading(false);
    },
    []
  );

  useEffect(() => {
    loadContent({ reference });
  }, [reference]);

  return (
    <>
      <style>{styles}</style>
      <div
        class="reference-container"
        style={{
          boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
          width: "250px",
          height: "fit-content",
        }}
      >
        <div class="reference-components">
          <span
            onClick={() => {
              handleRedirect({ reference });
            }}
            class="reference-title"
          >{`${tags.IdToName[reference?.book]} ${reference?.chapter}:${reference?.verse}`}</span>
          {rdLoading && <div class="loading-section"></div>}
          {!rdLoading && (
            <div class="reference-content">
              <span>{rfContent}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReferenceComponent;
