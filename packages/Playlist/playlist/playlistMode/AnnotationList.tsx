const { LoaderSecondary } = Components;
import { deleteAnnotation, getAnnotationRecord } from "db.annotations.library";

const { useState, useRef, useLayoutEffect } = os.appHooks;

const ChevronDown =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/d03c885823b300c141eed037466a2ad6ab59f9523e2ada5ac781f4f3e5e7e45f.svg";
const ChevronDown2 = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/0687c52f6f7d6f7d25052a14b3ee38581ad5753ffd139edc5ffffa378dd30fdf.svg";
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
  const [deleteModal, setDeleteModal] = useState({
    address: false,
    index: false,
  });
  const [loading, setLoading] = useState(false);
  const [deleteOverlay, setDeleteOverlay] = useState(false);

  const closeModal = () => setDeleteModal({
    address: false,
    index: false,
  });
  const closeOverlay = () => setDeleteOverlay(false);

  const position = useRef({});

  const onDelete = async (address,index) => {
    try {
      setLoading(true);
      const userRecord = await getAnnotationRecord();
      const res = await deleteAnnotation(userRecord, { id: address });
      if (res.success) {
        setAnnotationData((prev) => {
          const newData = [...prev];
          newData[index].data = newData[index].data.filter((ele) => ele.address !== address);
          if(newData[index].data.length === 0) {
            newData.splice(index, 1);
          }
          return newData;
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
      {deleteModal.address && (
        <ConfirmationModal
          loading={loading}
          title={globalThis.t("deleteAnnotation")}
          para={globalThis.t("deleteAnnotationConfirmation")}
          onClose={() => {
            if (!loading) closeModal();
          }}
          onConfirm={() => onDelete(deleteModal.address,deleteModal.index)}
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
            {annotationData.map((ele,index) => (
              <AnnotationHeading
                key={ele.address}
                address={ele.address}
                index={index}
                onDelete={onDelete}
                heading={ele.heading}
                tags={ele.tags}
                data={ele.data}
                currentOpenedBook={currentOpenedBook}
                chapter={chapter}
                deleteOverlay={deleteOverlay}
                setDeleteOverlay={setDeleteOverlay}
                position={position}
                setDeleteModal={setDeleteModal}
                closeOverlay={closeOverlay}
              />
            ))}
          </div>
        )
      ) : null}
    </>
  );
};

const AnnotationHeading = ({
  address,
  heading,
  tags,
  data,
  currentOpenedBook,
  chapter,
  authBot,
  deleteOverlay,
  setDeleteOverlay,
  position,
  setDeleteModal,
  onDelete,
  closeOverlay,
  index,
  getPosition,
}) => {
  const [isOpen, setIsOpen] = useState(true);


  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div style={{ height: isOpen ? 'max-content' : '2rem', overflow: 'hidden', transition: 'all 0.3s ease-in-out' }}>
      <div className="align-center" style={{ margin: "0.5rem 0", gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
        <p className="verse-annotation">{heading}</p>
        <img onClick={handleToggle} style={{ cursor: 'pointer', transition: 'transform 0.3s ease-in-out', marginLeft: 'auto', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} alt=">" src={ChevronDown2} />
      </div>
      <div className="align-center">
        {tags?.length > 0 ? (
          <div
            style={{ margin: "0.5rem 0", flexGrow: "1" }}
            className="align-center"
          >
            <img src={TagsIcon} alt="Tags" />
            {tags.map((tag, index) => (
              <div
                key={index}
                style={{ marginLeft: "0.5rem" }}
                className="align-center"
              >
                <p>{tag}</p>
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
        {false && <div>
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
              setDeleteOverlay(address);
            }}
          >
            <img src={MoreIcon} alt="more" />
          </p>
        </div>}
        {deleteOverlay === address && false && (
          <>
            <Overlay
              styles={{
                left: "calc(100% - 28px)",
                transform: "translateX(-100%)",
                width: "222px",
              }}
              onClose={closeOverlay}
              position={position.current}
              items={[
                {
                  click: () => {},
                  icon: "history",
                  disabled: true,
                  label: globalThis.t("showVersionHistory"),
                },
                {
                  disabled: true,
                  click: () => {},
                  icon: "download",
                  label: globalThis.t("download"),
                  noBorderBottom: true,
                },
                {
                  disabled: true,
                  click: () => {},
                  icon: "share",
                  label: globalThis.t("share"),
                },
                {
                  click: () => {
                    globalThis.SetEditAnnoData({
                      address: address,
                      prefixAddress: `${authBot?.id}.${currentOpenedBook?.bookId}.${currentOpenedBook?.chapter}`,
                      title: `${currentOpenedBook?.book} ${
                        heading === "Chapter"
                          ? `${globalThis.t("chapter")} ${chapter}`
                          : heading
                      }`,
                    });
                    globalThis.SetTab("create");
                  },
                  icon: "edit",
                  label: globalThis.t("editAnnotations"),
                  noBorderBottom: true,
                },
                {
                  click: () => {
                    setDeleteModal({
                      address: address,
                      index: index,
                    });
                    closeOverlay();
                  },
                  icon: "delete",
                  label: globalThis.t("deleteAnnotations"),
                },
              ]}
            />
          </>
        )}
      </div>
      <AnnodataMapper onDelete={
        ()=>{
          setDeleteModal({
            address: address,
            index: index,
          });
          closeOverlay();
        }
      } data={data} address={address} currentOpenedBook={currentOpenedBook} chapter={chapter} heading={heading} />
   
    </div>
  );
};

const AnnodataMapper = ({ data, address, currentOpenedBook, chapter, heading, onDelete }) => {
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem',fontSize: '12px' }}>
           <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
            <img style={{ width: '16px', height: '16px', borderRadius: '50%' }} src={contentData.createdByProfilePicture} alt="profile" />
            <p>{contentData.createdByName}</p>
           </div>
          <p style={{ textTransform: 'capitalize'}}>{FormatRelativeTime(contentData.updatedAtMs)}</p>
        </div>
        <div>
            <p 
            onClick={() => {
              onDelete(address);
            }}
            style={{ cursor: 'pointer', color: '#00000099' }}
            className="material-symbols-outlined">
              delete
            </p>
            <p
            onClick={() => {
              globalThis.SetEditAnnoData({
                address: address,
                prefixAddress: `${authBot?.id}.${currentOpenedBook?.bookId}.${currentOpenedBook?.chapter}`,
                title: `${currentOpenedBook?.book} ${
                  heading === "Chapter"
                    ? `${globalThis.t("chapter")} ${chapter}`
                    : heading
                  }`,
              });
              globalThis.SetTab("create");
            }}
            style={{ cursor: 'pointer', color: '#00000099' }}
            className="material-symbols-outlined">
              edit
            </p>
          </div>
        </div>
        </div>
      ))}
    </>
  );
};

return AnnotationList;
