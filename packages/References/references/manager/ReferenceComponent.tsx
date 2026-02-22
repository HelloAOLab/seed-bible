import type { ReferenceInterface } from "references.manager.interfaces";
import {
  GetReferences,
  GetChapterContent,
} from "references.manager.GetReferences";
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
      const content = await GetChapterContent({
        bookId: reference.book,
        chapter: reference.chapter,
        reference,
      });
      setRFContent(content);
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
          height: "170px",
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
