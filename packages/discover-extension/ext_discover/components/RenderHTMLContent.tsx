import { breakHtmlContent } from "ext_discover.hooks.breakHtmlContent";
import { getRenderHTMLContentManager } from "ext_discover.managers.RenderHTMLContentManager";
import type { RenderHTMLContentProps } from "ext_discover.interfaces.components.RenderHTMLContent";
import { Button } from "ext_discover.features.components.Button";
import { Modal } from "ext_discover.features.components.Modal";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

export function RenderHTMLContent({
  htmlContent,
  scope = "default",
  manager = getRenderHTMLContentManager(scope),
}: RenderHTMLContentProps) {
  manager.syncHtmlContent(htmlContent);

  const shouldRender = manager.shouldRender.value;
  const open = manager.open.value;
  const addToQueuePopup = manager.addToQueuePopup.value;
  const breakHTMLCONTENT = breakHtmlContent(htmlContent);

  return (
    <>
      {addToQueuePopup && (
        <Modal
          title={t("addPlaylistToQueueTitle")}
          showIcon={false}
          onClose={() => manager.setAddToQueuePopup(false)}
        >
          <p>{t("addPlaylistToQueueDescription")}</p>
          <ButtonsCover style={{ gap: "1rem", marginTop: "1rem" }}>
            <Button
              secondary
              onClick={() => {
                void manager.handlePlayCircleClick(null, true);
              }}
            >
              {t("yes")}
            </Button>
            <Button
              secondaryAlt
              onClick={() => manager.setAddToQueuePopup(false)}
            >
              {t("no")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      <div>
        <div
          className="render-html-content"
          ref={manager.setContainerRef}
          style={{
            overflow: "hidden",
            height: shouldRender ? (open ? "auto" : "60px") : "auto",
            textTransform: "none",
            transition: "all 0.2s linear",
            paddingBottom: "0.25rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            backgroundColor: "white",
          }}
          dangerouslySetInnerHTML={{ __html: breakHTMLCONTENT }}
        />

        {shouldRender && (
          <span
            style={{
              textAlign: "center",
              cursor: "pointer",
              fontSize: "12px",
              color: "var(--primaryButtonFill)",
              marginTop: "0.25rem",
            }}
            onClick={(e) => {
              e.stopPropagation();
              manager.toggleOpen();
            }}
          >
            {open ? "Show less" : "Show more"}
          </span>
        )}
      </div>
    </>
  );
}
