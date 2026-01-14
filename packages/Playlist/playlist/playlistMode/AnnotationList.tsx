const { LoaderSecondary } = Components;
import { deleteAnnotation, getAnnotationRecord } from "db.annotations.library";
const { useMemo, useEffect}  = os.appHooks;

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
const AnnotationListFilters = await thisBot.AnnotationListFilters();

const FilterIcon = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/b643c8bdb01906312ff5302bb029c1b8c35cd7a9a0a1f8f22e1358ccf675794e.svg";

function getTime(dateTimeStr:string) {
  if (!dateTimeStr) return null;

  // Split date and time
  const [datePart, timePart] = dateTimeStr.split("T");
  if (!datePart || !timePart) return null;

  const [month, day, year] = datePart.split("/").map(Number);
  if (!day || !month || !year) return null;

  // Remove 'Z' and split time
  const [hour, minute, second] = timePart
    .replace("Z", "")
    .split(":")
    .map(Number);

  return Date.UTC(
    year,
    month - 1,
    day,
    hour || 0,
    minute || 0,
    second || 0
  );
}


const initialFilters:any = {
  sources: {},
  tags: {},
  verse: {},
  fromDate: null,
  toDate: null,
  dateOption: "any",
};

const AnnotationList = ({
  currentOpenedBook,
  chapter,
  fetchingAnnotation,
  setAnnotationData,
  annotationData,
  annotationSources,
}) => {

  const [filters, setFilters] = useState({...initialFilters});
  const [showFilters, setShowFilters] = useState(false);


  useEffect(() => {
    const discoverContainer = document.getElementById("discover-container");
    // Set overflow to hidden when filters are shown and reset it when filters are hidden
    if (discoverContainer) {
      if(showFilters) {
        discoverContainer.style.overflow = "hidden";
      } else {
        discoverContainer.style.overflow = "auto";
      }
    }
    return () => {
      if(discoverContainer) {
        discoverContainer.style.overflow = "auto";
      }
    };
  }, [showFilters]);

  const onChangeFilters = (key:string, value:string) => {
    setFilters((prev) => {
      const oldFilters = { ...prev };
      if(key === "sources" || key === "tags" || key === "verse") {
        if(oldFilters[key][value]) {
          delete oldFilters[key][value];
        } else {
          oldFilters[key][value] = true;
        }
      }else if(key === "fromDate" || key === "toDate" || key === "dateOption") {
        oldFilters[key] = value;
      }
      return oldFilters;
    });
  };

  const onClearFilters = (key?:string) => {
    setFilters((prev:any) => {
      const oldFilters:any = { ...prev };
      if(key) {
        if(key === "sources" || key === "tags" || key === "verse") {
          oldFilters[key] = {};
        } else if(key === "dateOption") {
          oldFilters[key] = "any";
          oldFilters.fromDate = null;
          oldFilters.toDate = null;
        } else {
          oldFilters[key] = null;
        }
      } else {
        return {
          sources: {},
          tags: {},
          verse: {},
          fromDate: null,
          toDate: null,
          dateOption: "any",
        };
      }
      return oldFilters;
    });
  };


  const filteredAnnotationData = useMemo(() => {
    return annotationData.filter((ele) => {
      let isMatch = true;
      if(Object.keys(filters.sources).length > 0) {
        isMatch = filters.sources[ele.data[0].createdBy];
      }
      if(Object.keys(filters.tags).length > 0) {
        isMatch = isMatch && (ele.tags.some((tag) => filters.tags[tag]));
      }
      if(Object.keys(filters.verse).length > 0) {
        isMatch = isMatch && (Array.isArray(ele.verse) ? ele.verse.some((verse) => filters.verse[verse]) : filters.verse[ele.verse]);
      }

      let fromDate = "";
      let toDate = "";
      if(filters.dateOption === "any") {
        fromDate = "";
        toDate = "";
      } else if(filters.dateOption === "yesterday") {
        fromDate = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString();
        toDate = new Date().toISOString();
      } else if(filters.dateOption === "last_week") {
        fromDate = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString();
        toDate = new Date().toISOString();
      } else if(filters.dateOption === "last_month") {
        fromDate = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
        toDate = new Date().toISOString();
      } else if(filters.dateOption === "last_year") {
        fromDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString();
        toDate = new Date().toISOString();
      } else if(filters.dateOption === "custom") {
        fromDate = filters.fromDate || '';
        toDate = filters.toDate || '';
      }
     
      if(fromDate) {
        isMatch = isMatch && (ele.data[0].updatedAtMs >= getTime(`${fromDate}T00:00:00Z`));
      }
      if(toDate) {
        isMatch = isMatch && (ele.data[0].updatedAtMs <= getTime(`${toDate}T23:59:59Z`));
      }
      return isMatch;
    });
  }, [annotationData, filters]);

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
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" />
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
        <>
          {filteredAnnotationData.length === 0 && <p style={{ marginTop: "12px" }}>{globalThis.t("noAnnotationsFound")}</p>}
          <div className="annotation" style={{ position: 'relative' }}>
            <div className="filter-icon-container" style={{top: filteredAnnotationData.length > 0 ? '0.5rem' : '-2.1rem'}} onClick={() => setShowFilters(true)}>
              <img style={{ width: '16px', height: '16px' }} src={FilterIcon} alt="filter" />
            </div>
            { showFilters && 
             <AnnotationListFilters 
                onChangeFilters={onChangeFilters}
                onClearFilters={onClearFilters}
                currentOpenedBook={currentOpenedBook}
                filters={filters}
                handleClose={() => setShowFilters(false)}
                annotationSources={annotationSources}
              />
            }
            {filteredAnnotationData.map((ele,index) => (
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
                setShowFilters={setShowFilters}
                closeOverlay={closeOverlay}
              />
            ))}
          </div>
          </>
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
    <div className="annotation-item-container" style={{ height: isOpen ? 'max-content' : '2rem', overflow: 'hidden', transition: 'all 0.3s ease-in-out' }}>
      <div className="align-center" style={{ margin: "0.5rem 0", gap: '1rem', display: 'flex', width: '100%', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
          <p className="verse-annotation" style={{ textTransform: 'uppercase' }}>{heading}</p>
          <img onClick={handleToggle} style={{ cursor: 'pointer', transition: 'transform 0.3s ease-in-out', marginLeft: 'auto', transform: !isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} alt=">" src={ChevronDown2} />
        </div>   
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
          null
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
  const isMobile =
  (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
  MOBILE_VIEWPORT_THRESHOLD;
  return (
    <>
      {data.map((contentData, index) => (
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
          <div style={{ display: 'flex', marginBottom: '1.5rem', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem',fontSize: '12px', fontWeight: '500' }}>
             {(contentData.createdByName || contentData.createdByProfilePicture) ? (
              <>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                {contentData.createdByProfilePicture ?
                  <img style={{ width: '16px', height: '16px', borderRadius: '50%' }} src={contentData.createdByProfilePicture} alt="profile" />
                : null}
                {contentData.createdByName ? <p>
                  <i>{contentData.createdByName}</i>
                </p> : null}
              </div>
              <span style={{ fontSize: '12px', color: '#00000099' }}>|</span>
            </>) : null}
              <p style={{ textTransform: 'capitalize'}}>
                <i>{FormatRelativeTime(contentData.updatedAtMs)}</i>
              </p>
            </div>
            <div className={`actions-buttons-annotation ${isMobile ? 'isMobile' : ''}`} style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                <img
                  src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/86e70522cf977646771dfcffbafda114f8d4a7dbf39923d6791a66b8a25c2a56.svg"
                  onClick={() => {
                    onDelete(address);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              <span style={{ fontSize: '12px', color: '#00000099' }}>|</span>
              <img
                src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/badbe8b10d39a043fbf49a7d7749e4fc311c34c1c8c562ab60ee052e470f5451.svg"
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
                style={{ cursor: 'pointer' }}
                />
              </div>
            </div>
        </div>
      ))}
    </>
  );
};

return AnnotationList;
