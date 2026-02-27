import type { ReferenceInterface } from "references.manager.interfaces";
import {
  GetReferences,
  GetChapterContent,
} from "references.manager.GetReferences";
const { useState, useEffect, useCallback } = os.appHooks;
const styles = tags["Reference.css"];

const ReferenceComponent = (props: {
  reference: ReferenceInterface;
  baseUrl: string;
  translation: string;
  handleRedirect: (props: { reference: ReferenceInterface }) => void;
}) => {
  const { reference, handleRedirect, baseUrl, translation } = props;
  const [rdLoading, setRdLoading] = useState(true);
  const [bookName, setBookName] = useState("");
  const [rfContent, setRFContent] = useState("");

  const loadContent = useCallback(
    async (props: { reference: ReferenceInterface }) => {
      const { reference } = props;
      setRdLoading(true);
      const content = await GetChapterContent({
        bookId: reference.book,
        chapter: reference.chapter,
        reference,
        baseUrl: baseUrl,
        translation: translation,
      });
      if (!content) {
        setRdLoading(false);
        return;
      }
      setRFContent(content.content);
      setBookName(content.bookData.name);
      setRdLoading(false);
    },
    [reference, baseUrl, translation]
  );

  useEffect(() => {
    loadContent({ reference });
  }, [reference, baseUrl, translation]);

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
          {rdLoading && (
            <>
              <div class="loading-section" style={{ height: "1rem" }}></div>
              <div class="loading-section"></div>
            </>
          )}
          {!rdLoading && rfContent && bookName && (
            <>
              <span
                onClick={() => {
                  handleRedirect({
                    reference: { ...reference, bookName: bookName },
                  });
                }}
                class="reference-title"
              >{`${bookName} ${reference?.chapter}:${reference?.verse}`}</span>
              <div class="reference-content">
                <span>{rfContent}</span>
              </div>
            </>
          )}
          {!rdLoading && (!rfContent || !bookName) && (
            <div class="no-content">
              No content found for this reference in the current translation.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReferenceComponent;
