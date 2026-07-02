import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import { ANNOTATION_LIST_ICONS } from "ext_discover.models.annotationList";
import { AttachmentLinkItem } from "ext_discover.components.AttachmentLinkItem";
import { RenderHTMLContent } from "ext_discover.components.RenderHTMLContent";
import type { AnnotationDataMapperProps } from "ext_discover.interfaces.components.AnnotationDataMapper";

const G = globalThis as Record<string, any>;
const isMobile =
  (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
  G.MOBILE_VIEWPORT_THRESHOLD;

export function AnnotationDataMapper({
  data,
  address,
  currentOpenedBook,
  chapter,
  heading,
  onDelete,
  isPlayingPlaylist,
  scope = "default",
}: AnnotationDataMapperProps) {
  return (
    <>
      {data.map((contentData: any, index: number) => (
        <div key={contentData.id}>
          <div style={{ margin: "0.5rem 0" }}>
            {contentData.type === "attachment-link" ||
            contentData.type === "date" ? (
              <AttachmentLinkItem
                linkingMode={false}
                viewOnly={true}
                isSomethingEmbededChecked={false}
                datesRepeat={false}
                datesInWrongOrder={false}
                playlistName={false}
                currentFormat={false}
                checked={false}
                layers={false}
                draggable={false}
                oldItemsMap={{}}
                currentDateActive={false}
                originalIndex={index}
                activeItemID={false}
                clickPass={false}
                activeItemList={{}}
                playlistId={false}
                onClickItem={() => {}}
                checkListData={{}}
                creatingPlaylist={true}
                isPlaylistNestedSupported
                isPlaylistNestedPlayAble
                checklistEnabled={false}
                index={index}
                editDataFromPlaylist={() => {}}
                embedding={false}
                handleDragStart={() => {}}
                handleDragOver={() => {}}
                toggle={false}
                setList={() => {}}
                pId={contentData.id}
                handleDragEnd={() => {}}
                originalList={[]}
                playListSubIndex={false}
                deleteFromList={() => {}}
                playingPlaylist={false}
                data={contentData}
                onDisembed={() => {}}
                onClickCheckbox={() => {}}
                scope={`${scope}-${contentData.id}`}
              />
            ) : (
              <div
                onClick={() => {
                  void navigationWithDataItem(
                    { dataItem: contentData },
                    G.Playlist
                  );
                }}
                style={{
                  pointer: contentData.type !== "heading" ? "cursor" : "",
                }}
                className={`annotation-list-item annotation-list-item-type-comment ${
                  contentData.type === "heading" ? "" : "scriptures"
                }`}
              >
                <div>
                  <RenderHTMLContent htmlContent={contentData.content} />
                </div>
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              marginBottom: "1.5rem",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "0.5rem",
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              {contentData.createdByName ||
              contentData.createdByProfilePicture ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    {contentData.createdByProfilePicture ? (
                      <img
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                        }}
                        src={contentData.createdByProfilePicture}
                        alt="profile"
                      />
                    ) : null}
                    {contentData.createdByName ? (
                      <p>
                        <i>{contentData.createdByName}</i>
                      </p>
                    ) : null}
                  </div>
                  <span style={{ fontSize: "12px", color: "#00000099" }}>
                    |
                  </span>
                </>
              ) : null}
              <p style={{ textTransform: "capitalize" }}>
                <i>{FormatRelativeTime(contentData.updatedAtMs)}</i>
              </p>
            </div>
            <div
              className={`actions-buttons-annotation ${isMobile ? "isMobile" : ""}`}
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              <img
                className="img-icon"
                src={ANNOTATION_LIST_ICONS.delete}
                onClick={() => {
                  if (isPlayingPlaylist) {
                    return ShowNotification({
                      message: t("actionNotAllowedWhilePlaylistIsPlaying"),
                      severity: "error",
                    });
                  }
                  onDelete();
                }}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: "12px", color: "#00000099" }}>|</span>
              <img
                className="img-icon"
                src={ANNOTATION_LIST_ICONS.edit}
                onClick={() => {
                  if (isPlayingPlaylist) {
                    return ShowNotification({
                      message: t("actionNotAllowedWhilePlaylistIsPlaying"),
                      severity: "error",
                    });
                  }
                  G.SetEditAnnoData({
                    address: address,
                    prefixAddress: `${authBot?.id}.${currentOpenedBook?.bookId}.${currentOpenedBook?.chapter}`,
                    title: `${currentOpenedBook?.book} ${
                      heading === "Chapter"
                        ? `${t("chapter")} ${chapter}`
                        : heading
                    }`,
                  });
                  G.SetTab("create");
                }}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
