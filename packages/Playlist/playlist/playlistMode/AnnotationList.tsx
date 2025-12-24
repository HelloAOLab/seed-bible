const { LoaderSecondary } = Components;
import { deleteAnnotation, getAnnotationRecord } from "db.annotations.library";

const { useState, useRef } = os.appHooks;

const ChevronDown =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/d03c885823b300c141eed037466a2ad6ab59f9523e2ada5ac781f4f3e5e7e45f.svg";
const Literature =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b4c9aac96520900a89350f9569f485b0b7a037af8dce3144e5d84126c0f5ce3c.svg";
const TagsIcon =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/c4473eb66d4b6947be29fa8df15689fbcb23cf7e970d480b2c6f9ecae14026c5.svg";
const Dot =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/dcf47b43fe68034fe7cf0b4e4400f7267cf9c320b6175fe77d44f70459fe50a5.svg";
const MoreIcon =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/ec7854e81211e9599dd87bf27df38e355e9b32b63da3601593bc8bed17327ae9.svg";
const AttachmentLinkItem = await thisBot.AttachmentLinkItem();
const ConfirmationModal = await thisBot.ConfirmationModal();
const RenderHTMLContent = await thisBot.RenderHTMLContent();
const Overlay = await thisBot.Overlay();

const AnnotationList = ({
  currentOpenedBook,
  chapter,
  fetchingAnnotation,
  setAnnotationData,
  annotationData,
}) => {
  const [deleteModal, setDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteOverlay, setDeleteOverlay] = useState(false);

  const closeModal = () => setDeleteModal(false);
  const closeOverlay = () => setDeleteOverlay(false);

  const position = useRef({});

  const onDelete = async (address) => {
    try {
      setLoading(true);
      const userRecord = await getAnnotationRecord();
      const res = await deleteAnnotation(userRecord, { id: address });
      if (res.success) {
        setAnnotationData((prev) => {
          return prev.filter((ele) => ele.address !== address);
        });
        closeModal();
        ShowNotification({
          message: t("annotationDeletedSuccessfully"),
          severity: "success",
        });
      } else {
        ShowNotification({
          message: t("failedToDeleteAnnotation"),
          severity: "error",
        });
      }
      setLoading(false);
    } catch (err) {
      ShowNotification({
        message: t("failedToDeleteAnnotation"),
        severity: "error",
      });
      setLoading(false);
    }
  };

  return (
    <>
      {deleteModal && (
        <ConfirmationModal
          loading={loading}
          title={globalThis.t("deleteAnnotation")}
          para={globalThis.t("deleteAnnotationConfirmation")}
          onClose={() => {
            if (!loading) closeModal();
          }}
          onConfirm={() => onDelete(deleteModal)}
        />
      )}

      <h3 style={{ margin: "1rem 0 0 0 " }}>{globalThis.t("annotations")}</h3>
      {fetchingAnnotation && (
        <div style={{ margin: "1rem 0", gap: "1rem" }} className="align-center">
          <LoaderSecondary />
          <p>{globalThis.t("fetchingAnnotations")}</p>
        </div>
      )}
      {!fetchingAnnotation ? (
        annotationData.length === 0 ? (
          <p style={{ marginTop: "12px" }}>{globalThis.t("noAnnotationsFound")}</p>
        ) : (
          <div className="annotation">
            <div className="heading">
              <p>Chapter {chapter}</p>
              <img alt=">" src={ChevronDown} />
            </div>

            {annotationData.map((ele) => (
              <div>
                <div className="align-center" style={{ margin: "0.5rem 0" }}>
                  <img
                    style={{ marginRight: "0.5rem" }}
                    src={Literature}
                    alt="Literature"
                  />
                  <p className="verse-annotation">{ele.heading}</p>
                </div>
                <div className="align-center">
                  {ele?.tags?.length > 0 ? (
                    <div
                      style={{ margin: "0.5rem 0", flexGrow: "1" }}
                      className="align-center"
                    >
                      <img src={TagsIcon} alt="Tags" />
                      {ele.tags.map((ele) => (
                        <div
                          style={{ marginLeft: "0.5rem" }}
                          className="align-center"
                        >
                          <p>{ele}</p>
                          <img
                            style={{ margin: "0 0.5rem" }}
                            src={Dot}
                            alt="dot"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{ margin: "0.5rem 0", flexGrow: "1" }}
                      className="align-center"
                    ></div>
                  )}
                  <div>
                    <p
                      className="pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();

                        const x = rect.left; // X position where the element starts (from left of screen)
                        const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

                        globalThis.LastClickX = x;
                        globalThis.LastClickY = y;
                        position.current = { ...getPosition() };
                        setDeleteOverlay(ele.address);
                      }}
                    >
                      <img src={MoreIcon} alt="more" />
                    </p>
                  </div>
                  {deleteOverlay === ele.address && (
                    <>
                      <Overlay
                        styles={{
                          left: "calc(100% - 28px)",
                          transform: "xxxx",
                          width: "222px",
                        }}
                        onClose={closeOverlay}
                        position={position.current}
                        items={[
                          {
                            click: () => {},
                            icon: "history",
                            disabled: true,
                            label: t("showVersionHistory"),
                          },
                          {
                            disabled: true,
                            click: () => {},
                            icon: "download",
                            label: t("download"),
                            noBorderBottom: true,
                          },
                          {
                            disabled: true,
                            click: () => {},
                            icon: "share",
                            label: t("share"),
                          },
                          {
                            click: () => {
                              globalThis.SetEditAnnoData({
                                address: ele.address,
                                prefixAddress: `${authBot?.id}.${currentOpenedBook?.bookId}.${currentOpenedBook?.chapter}`,
                                title: `${currentOpenedBook?.book} ${
                                  ele.heading === "Chapter"
                                    ? `${globalThis.t("chapter")} ${chapter}`
                                    : ele.heading
                                }`,
                              });
                              globalThis.SetTab("create");
                            },
                            icon: "edit",
                            label: t("editAnnotations"),
                            noBorderBottom: true,
                          },
                          {
                            click: () => {
                              setDeleteModal(ele.address);
                              closeOverlay();
                            },
                            icon: "delete",
                            label: t("deleteAnnotations"),
                          },
                        ]}
                      />
                    </>
                  )}
                </div>
                <AnnodataMapper data={ele.data} />
              </div>
            ))}
          </div>
        )
      ) : null}
    </>
  );
};

const AnnodataMapper = ({ data }) => {
  return (
    <>
      {data.map((contentData, index) => (
        <div key={contentData.id} style={{ paddingLeft: "0.5rem" }}>
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
                readingPlanEnabled={false}
                layers={false}
                draggable={false}
                oldItemsMap={{}}
                currentDateActive={false}
                originalIndex={index}
                setDragoverSet={{}}
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
                checkListData={{}}
                editDataFromPlaylist={() => {}}
                embedding={false}
                handleDragStart={() => {}}
                handleDragOver={() => {}}
                toggle={false}
                setList={() => {}}
                layers={false}
                pId={contentData.id}
                handleDragEnd={() => {}}
                originalList={[]}
                playListSubIndex={false}
                deleteFromList={() => {}}
                key={`${contentData.id}-${contentData.readAlready}`}
                playingPlaylist={false}
                data={contentData}
                onDisembed={() => {}}
                onClickCheckbox={() => {}}
              />
            ) : (
              <div
                onClick={() => {
                  thisBot.navigationWithDataItem({ dataItem: contentData });
                }}
                style={{
                  pointer: contentData.type !== "heading" ? "cursor" : "",
                }}
                className={`annotation-list-item ${
                  contentData.type === "heading" ? "heading" : "scriptures"
                }`}
              >
                <div>
                  <RenderHTMLContent htmlContent={contentData.content} />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
};

return AnnotationList;
