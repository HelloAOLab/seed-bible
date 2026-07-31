const { useState, useLayoutEffect, useRef, useMemo } = os.appHooks;
import {
  getAnnotationRecord,
  createAnnotation,
  saveAnnotation,
} from "db.annotations.library";

const G = globalThis as any;

const isMobile =
  (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
  G.MOBILE_VIEWPORT_THRESHOLD;
const {
  Chips,
  Checkbox,
  Button,
  Tooltip,
  LoaderSecondary,
  Modal,
  ButtonsCover,
} = G.Components;

const AttachmentLinkItem = thisBot.AttachmentLinkItem();
const VideoPlayer = await thisBot.VideoSmallScreen();
const AudioPlayer = await thisBot.AudioPlayer();
const RenderHTMLContent = await thisBot.RenderHTMLContent();
const TogglePlaylistHeight = await thisBot.TogglePlaylistHeight();

const PREVIEW_ICON_INACTIVE =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/ab00f4b4a4332fd7ed0bc367cb1bb4997b885c19f422bfbcebaccffc926ce350.svg";
const PREVIEW_ICON_ACTIVE =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/c9313a31249a980b996ccabd27c6aaf0d0cc4037944f425370ff8b3500644b30.svg";

import { CustomAnnotationTextEditor } from "playlist.playlistMode.CustomAnnotationTextEditor";
import { extractHashtagsFromHTML } from "playlist.playlistMode.AutoTag";

const AnnotationInnerDiv = (props: any) => {
  const {
    data,
    onRemoveTag,
    onDisembed,
    index,
    embedding,
    pId = null,
    isEditAddress,
    checklistEnabled,
    finalHistoryObject,
    setList,
    setChecklistEmbeded,
    checkListData,
    selectedAnnotation,
    checkListEmbeded,
    originalIndex,
    editDataFromPlaylist,
    isSomethingEmbededChecked,
    onClick,
    deleteAttachment,
    selected,
    setEmbedding,
    dragOverSet,
    onClickCheckbox,
    deleteFromList,
    singleMode,
    embeded = false,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = props;
  const [expand, setExpand] = useState(false);

  useLayoutEffect(() => {
    if (selectedAnnotation === data.id) {
      setExpand(true);
    }
  }, [selectedAnnotation]);

  useLayoutEffect(() => {
    G[`${data.id}OpenToggle`] = setExpand;
    return () => {
      G[`${data.id}OpenToggle`] = null;
    };
  }, [expand]);

  return (
    <>
      <div
        key={`${data.id}-${data.readAlready}`}
        onDragStart={() => handleDragStart(index, pId)}
        onDragOver={(e) => handleDragOver(index, originalIndex, pId, e)}
        onDragEnd={handleDragEnd}
        tabIndex={0}
        // ref={(ref) => setRef.current[data.id] = ref}
        style={{ display: "flex" }}
        className={`history-item ${
          dragOverSet.itemId === data.id && `dropabble-${dragOverSet.position}`
        } ${embedding === data.id ? "embedding-on" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(data.id);
        }}
        draggable={true}
        onPointerDown={() => {
          G.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
            G.ADDING_TOPLAYLIST_TIMEOUT = null;
            // if (data.type !== "heading") onClickItem({ dataItem: data });
          }, 1000);
        }}
        onPointerUp={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT) {
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
          }
        }}
        onMouseDown={(e) => e.stopPropagation()} // block parent drag
        onMouseLeave={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
        }}
        onTouchEnd={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
        }}
      >
        <div className="start-actions">
          {checklistEnabled ? (
            <Checkbox
              small
              // disabled={embedding === data.id || isSomethingEmbededChecked}
              disabled={embedding === data.id}
              checked={
                checkListData[data.id] ||
                embedding === data.id ||
                data.readAlready ||
                checkListEmbeded?.[data.id]
              }
              onClick={() => {
                if (onClickCheckbox) {
                  onClickCheckbox();
                  return;
                }
                const isShiftHold = G?.KEY_HOLD?.["shift"];
                if (isShiftHold) {
                  let upperLimit = Math.max(index, G.LAST_CLICK_ID);
                  let lowerLimit = Math.min(index, G.LAST_CLICK_ID);
                  const idsFilter = finalHistoryObject
                    .filter(
                      (ele: { id: string }, indexInner: number) =>
                        indexInner <= upperLimit &&
                        indexInner >= lowerLimit &&
                        indexInner !== G.LAST_CLICK_ID &&
                        ele.id !== embedding
                    )
                    .map((ele: { id: string }) => ele.id);
                  editDataFromPlaylist(idsFilter, false);
                  G.LAST_CLICK_ID = index;
                  return;
                } else {
                  G.LAST_CLICK_ID = index;
                }

                if (
                  !embedding &&
                  data.type !== "heading" &&
                  !isSomethingEmbededChecked &&
                  !isEditAddress
                ) {
                  if (G.KEY_HOLD?.["control"] || G.KEY_HOLD?.["meta"]) {
                    if (!singleMode) {
                      setEmbedding(data.id);
                      return;
                    }
                  }
                }
                editDataFromPlaylist(data.id, false);
              }}
            />
          ) : null}
        </div>
        <p
          onPointerUp={() => {
            // if (G.ADDING_TOPLAYLIST_TIMEOUT) {
            //     clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT)
            //     if ((data.type !== "heading")) {
            //         onClick({ dataItem: data, index });
            //     }
            // }
            // if (clickPass && (data.type !== "heading")) {
            //     onClick({ dataItem: data, index });
            // }
          }}
          style={{
            border: selected ? "1px solid #D36433" : "",
            backgroundColor: selected ? "#D364334D" : "",
            paddingRight: "3rem",
            textAlign: "justify",
          }}
          className={`playlist-item-type ${
            data.type !== "date" && checklistEnabled
              ? "checklistEnabled two"
              : "no-left-padding"
          } playlist-item-${data.type}`}
        >
          {data.type === "heading" ? (
            <RenderHTMLContent htmlContent={data.content} />
          ) : (
            data.content
          )}
        </p>
        <div className="actions">
          {data.type === "heading" ? (
            <p
              className={`end-icon without-right-margin ${`${
                isMobile && "visible"
              } end-icon without-right-margin`}`}
              onClick={(e) => {
                e.stopPropagation();
                G.SetEditRichText?.({
                  id: data.id,
                  text: data.content,
                });
              }}
            >
              <span class="material-symbols-outlined">edit</span>
            </p>
          ) : null}
          {embeded ? (
            <p
              className={`end-icon without-right-margin ${`${
                isMobile && "visible"
              } end-icon without-right-margin`}`}
              onClick={(e) => {
                e.stopPropagation();
                onDisembed({ idFinal: data.id, pId: pId });
              }}
            >
              <span class="material-symbols-outlined unfollow delete-icon">
                link_off
              </span>
            </p>
          ) : (
            data.type !== "heading" &&
            data.id !== "singleMode" &&
            !embedding && (
              <p
                className={`end-icon without-right-margin ${`${
                  isMobile && "visible"
                } end-icon without-right-margin`}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (data.type === "heading") {
                    ShowNotification({
                      message: t("headingsAndMediaCannotBeEmbedded"),
                      severity: "error",
                    });
                  } else {
                    if (!isEditAddress) {
                      if (!singleMode) setEmbedding(data.id);
                      if (checkListData[data.id]) {
                        editDataFromPlaylist(data.id, false);
                      }
                    } else {
                      editDataFromPlaylist(data.id, false);
                    }
                  }
                }}
              >
                <span class="material-symbols-outlined">pip</span>
              </p>
            )
          )}
          {data.additionalInfo?.layers?.length > 0 ? (
            <p className="without-right-margin end-icon visible">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setExpand((p) => !p);
                }}
                class="material-symbols-outlined unfollow "
                style={{ fontSize: "1.2rem" }}
              >
                {expand ? "collapse_content" : "expand_content"}
              </span>
            </p>
          ) : null}
          <p
            className={`end-icon without-right-margin ${`${
              isMobile && "visible"
            } end-icon without-right-margin`}`}
            onClick={(e) => {
              e.stopPropagation();
              deleteFromList(data.id, pId);
            }}
          >
            <span class="material-symbols-outlined unfollow delete-icon">
              delete
            </span>
          </p>
        </div>
      </div>
      {!embeded && !!data.additionalInfo.tags?.length && (
        <div style={{ display: "flex" }}>
          <p style={{ padding: "1rem", fontSize: "1rem", fontWeight: "700" }}>
            Tags:
          </p>
          <div
            className="align-center"
            style={{
              flexWrap: "wrap",
              flexGrow: "1",
              margin: "0.5rem 0",
              gap: "0.5rem",
            }}
          >
            {data.additionalInfo.tags.map((ele: string, index: number) => (
              <Chips
                label={ele}
                key={index}
                onDelete={() => {
                  onRemoveTag(index, data.id);
                }}
              />
            ))}
          </div>
        </div>
      )}
      {!embeded && expand && (
        <div style={{ paddingLeft: "1rem" }}>
          {data.additionalInfo.layers?.map((ele: any, indexInner: number) =>
            ele.type === "attachment-link" || ele.type === "date" ? (
              <AttachmentLinkItem
                linkingMode={false}
                isPlaylistNestedSupported
                viewOnly={false}
                isSomethingEmbededChecked={isSomethingEmbededChecked}
                datesRepeat={false}
                datesInWrongOrder={false}
                playlistName={false}
                currentFormat={false}
                checked={checkListEmbeded?.[ele.id]}
                readingPlanEnabled={false}
                isEditAddress={isEditAddress}
                layers={false}
                originalList={finalHistoryObject}
                draggable={true}
                oldItemsMap={{}}
                dragOverSet={dragOverSet}
                currentDateActive={false}
                originalIndex={index}
                activeItemID={false}
                clickPass={false}
                activeItemList={{}}
                onClick={() => {}}
                playlistId={false}
                onClickItem={() => {}}
                creatingPlaylist={true}
                checklistEnabled={checklistEnabled}
                index={indexInner}
                checkListData={checkListData}
                editDataFromPlaylist={editDataFromPlaylist}
                embedding={embedding}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDragEnd={handleDragEnd}
                toggle={false}
                setList={() => {}}
                pId={data.id}
                playListSubIndex={false}
                deleteFromList={deleteAttachment}
                key={`${ele.id}-${ele.readAlready}`}
                playingPlaylist={false}
                data={ele}
                onDisembed={() => {
                  onDisembed({ id: ele.id, pId: data.id });
                }}
                onClickCheckbox={() => {
                  const isShiftHold = G?.KEY_HOLD?.["shift"];
                  if (isShiftHold && data.id === G.LAST_CLICK_EMBED_PARENT) {
                    let upperLimit = Math.max(
                      indexInner,
                      G.LAST_CLICK_EMBED_ID
                    );
                    let lowerLimit = Math.min(
                      indexInner,
                      G.LAST_CLICK_EMBED_ID
                    );
                    const idsFilter = data.additionalInfo.layers
                      .filter(
                        (ele: { id: string }, indexInner: number) =>
                          indexInner <= upperLimit &&
                          indexInner >= lowerLimit &&
                          indexInner !== G.LAST_CLICK_EMBED_ID &&
                          ele.id !== embedding
                      )
                      .map((ele: { id: string }) => ele.id);
                    setChecklistEmbeded(idsFilter, data.id);
                    G.LAST_CLICK_EMBED_PARENT = data.id;
                    G.LAST_CLICK_EMBED_ID = indexInner;

                    return;
                  } else {
                    G.LAST_CLICK_EMBED_PARENT = data.id;
                    G.LAST_CLICK_EMBED_ID = indexInner;
                  }
                  setChecklistEmbeded(ele.id, data.id);
                }}
              />
            ) : (
              <AnnotationInnerDiv
                onDisembed={onDisembed}
                embedding={embedding}
                checklistEnabled={checklistEnabled}
                dragOverSet={dragOverSet}
                setList={setList}
                handleDragStart={handleDragStart}
                isEditAddress={isEditAddress}
                handleDragOver={handleDragOver}
                handleDragEnd={handleDragEnd}
                checkListData={checkListData}
                editDataFromPlaylist={editDataFromPlaylist}
                index={indexInner}
                onRemoveTag={onRemoveTag}
                deleteAttachment={deleteAttachment}
                deleteFromList={deleteFromList}
                checkListEmbeded={checkListEmbeded}
                selected={ele.id === selectedAnnotation}
                data={ele}
                originalIndex={index}
                key={`${ele.id}-${ele.readAlready}`}
                embeded
                pId={data.id}
                onClickCheckbox={() => {
                  const isShiftHold = G?.KEY_HOLD?.["shift"];
                  if (isShiftHold && data.id === G.LAST_CLICK_EMBED_PARENT) {
                    let upperLimit = Math.max(
                      indexInner,
                      G.LAST_CLICK_EMBED_ID
                    );
                    let lowerLimit = Math.min(
                      indexInner,
                      G.LAST_CLICK_EMBED_ID
                    );
                    const idsFilter = data.additionalInfo.layers
                      .filter(
                        (ele: { id: string }, indexInner: number) =>
                          indexInner <= upperLimit &&
                          indexInner >= lowerLimit &&
                          indexInner !== G.LAST_CLICK_EMBED_ID &&
                          ele.id !== embedding
                      )
                      .map((ele: { id: string }) => ele.id);
                    setChecklistEmbeded(idsFilter, false);
                    G.LAST_CLICK_EMBED_PARENT = data.id;
                    G.LAST_CLICK_EMBED_ID = indexInner;
                    return;
                  } else {
                    G.LAST_CLICK_EMBED_PARENT = data.id;
                    G.LAST_CLICK_EMBED_ID = indexInner;
                  }
                  setChecklistEmbeded(ele.id, data.id);
                }}
              />
            )
          )}
        </div>
      )}
    </>
  );
};

const AddAnotationUI = (props: any) => {
  const {
    list,
    annoation,
    setMode,
    showPlaylistSettings,
    id,
    setShowPlaylistSettings,
    onReset,
    setList,
    editData = null,
    setTab,
  } = props;
  G[`FirstAnnnotationItem`] = list[0];

  // Audio
  const [mediaURL, setMediaURL] = useState("");
  const [videoSrc, setVideoSrc] = useState(false);
  const [currentItem, setCurrentItem] = useState({});

  const [loseProgresss, setLoseProgresss] = useState(false);
  const loseProgressAction = useRef<() => void>(null);

  const [singleMode, setSingleMode] = useState(true);
  const [embedItems, setEmbedItems] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [textHTML, setTextHTML] = useState(G.PreviousHTML || "");

  // Edit Mode
  const [isEditAddress, setIsEditAddress] = useState(editData?.address);
  const [editDataDetails, setEditDataDetails] = useState<any>(
    G.EditAnnoDataDetailsRestorePlaylist || {}
  );

  const [showPreview, setShowPreview] = useState(false);

  G.SetVideoSrc = setVideoSrc;
  G.SetMediaURL = setMediaURL;
  G.SetCurrentItem = setCurrentItem;

  const [selectedAnnotation, setSelectedAnnotation] = useState(
    G.SelectedItemIDForAttachments
  );

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [publishAccess, setPublishAccess] = useState(
    G.PublishAccessRestorePlaylist || "public"
  );

  const [loading, setLoading] = useState(false);
  const [dataFetching, setDataFetching] = useState(false);

  const [checkListData, setChecklistData] = useState<Record<string, boolean>>(
    {}
  );
  const [checkListEmbeded, setChecklistEmbeded] = useState<
    Record<string, boolean>
  >({});
  const [embedding, setEmbedding] = useState<string | boolean | null>(null);

  const [checklistEnabled, setChecklistEnabled] = useState(false);

  useLayoutEffect(() => {
    G.SetSelectedAnnotations = setSelectedAnnotation;
    G.AddAnotationUI = true;
    if (
      editData?.address &&
      editData?.address !== G.LastEditingAnnotationAddress
    ) {
      (async () => {
        G.LastEditingAnnotationAddress = editData?.address;
        setDataFetching(true);
        setList([]);
        try {
          // const latestData = await shout("chronicle_loadData", { record: latestRecord[0], targetVersion: 0 })[0];
          const userRecord = await getAnnotationRecord();
          const res: any = await os.getData(userRecord, editData?.address);
          let data: any = res.data.data;
          if (data.type === "comment") {
            data = res.data;
            setTextHTML(data.data.html);
            setTags([...(data.chronicle_tags || [])]);
            G.IsEditingAnnotation = true;
            const booksDetails = G.findNameRank(data.bookId);
            const ediDataBookItem = {
              type: "heading",
              content: data.data.html,
              createdAtMs: data.data.createdAtMs,
              updatedAtMs: data.data.updatedAtMs,
              userId: data.data.userId,
              userName: data.data.userName,
              userProfilePicture: data.data.userProfilePicture,
              additionalInfo: {
                verse: data.verseNumber,
                chapter: data.chapterNumber,
                book: data.bookId,
                data: {
                  bookId: data.bookId,
                },
                bookRank: booksDetails.item,
              },
              id: data.id,
            };
            G.EditAnnoDataDetailsRestorePlaylist = ediDataBookItem;
            setEditDataDetails(ediDataBookItem);
          } else if (data.data) {
            G.EditAnnoDataDetailsRestorePlaylist = { ...data.data };
            setEditDataDetails({ ...data.data });
            const layers = data.data.additionalInfo?.layers?.filter(
              (ele: any) => ele.type === "heading"
            );
            setTextHTML(layers?.[0]?.content || "");
            setTags([...(data.chronicle_tags || [])]);
            G.IsEditingAnnotation = true;
          } else {
            setDataFetching(false);
            ShowNotification({
              message: t("failedToFetchAnnotations"),
              severity: "error",
            });
          }
        } catch (e) {
          console.error(`${t("errorFetchingAnnotations")}:`, e);
          ShowNotification({
            message: t("failedToFetchAnnotations"),
            severity: "error",
          });
        } finally {
          setDataFetching(false);
        }
      })();
    }
    G.SelectedItemIDForAttachments = null;
    return () => {
      G.SetSelectedAnnotations = null;
      G.IsEditingAnnotation = false;
      G.SelectedItemIDForAttachments = null;
      if (isEditAddress) {
        G[`${id}mode`] = G.PlaylistModeTypes.playlist;
        setList([]);
        G[`${id}currentPlaylist`] = [];
        G.SelectedItemIDForAttachments = null;
      }
      setIsEditAddress(false);
      G.SetEditAnnoData?.(null);
    };
  }, []);

  // Restore publish access
  useLayoutEffect(() => {
    G.PublishAccessRestorePlaylist = publishAccess;
  }, [publishAccess]);

  G.AnnotationUISingleMode = singleMode;

  useLayoutEffect(() => {
    G.SelectedItemIDForAttachments = selectedAnnotation;
    G.PreviousHTML = textHTML;
  }, [selectedAnnotation, textHTML]);

  useLayoutEffect(() => {
    G[`SetChecklistEnabled`] = setChecklistEnabled;
    return () => {
      G[`SetChecklistEnabled`] = null;
    };
  }, [checklistEnabled]);

  const massAdd = (items: any[]) => {
    if (singleMode) {
      setEmbedItems((prev) => [...prev, ...items]);
      return;
    }
    setList((old: any[]) => {
      const prev = [...old];
      const index = prev.findIndex((ele) => ele.id === selectedAnnotation);
      const targetVerse = prev[index];
      targetVerse.additionalInfo.layers = [
        ...items,
        ...(targetVerse.additionalInfo.layers || []),
      ];
      prev[index] = targetVerse;
      return prev;
    });
  };

  const onEmbedItems = (title: string, link: string, linkState: any) => {
    const embedItem = {
      id: G.createUUID(),
      content: title,
      additionalInfo: {
        link,
        ...linkState,
      },
      type: linkState.type === "text" ? "heading" : "attachment-link",
    };
    if (singleMode) {
      setEmbedItems((prev) => [...prev, { ...embedItem }]);
      return;
    }

    setList((old: any[]) => {
      const prev = [...old];
      const index = prev.findIndex((ele) => ele.id === selectedAnnotation);
      const targetVerse = prev[index];
      targetVerse.additionalInfo.layers = [
        { ...embedItem },
        ...(targetVerse.additionalInfo.layers || []),
      ];
      prev[index] = targetVerse;
      return prev;
    });
  };

  const onEmbedInside = () => {
    if (!embedding) return;

    let embededItem = null;

    list.forEach((ele: any) => {
      if (checkListData[ele.id] && ele.id !== embedding) {
        if (ele.additionalInfo?.layers?.length) {
          embededItem = ele.content;
        }
      }
    });

    if (embededItem) {
      ShowNotification({
        message: t("cannotEmbedEmbeddedItem", { embededItem }),
        severity: "error",
      });
      return;
    }
    setList((prev: any[]) => {
      const oldItems: any[] = [];
      const newLayers: any[] = [];
      const old = [...prev];
      old.forEach((ele) => {
        if (checkListData[ele.id]) {
          newLayers.push({
            ...ele,
          });
        }
        if (!checkListData[ele.id]) {
          oldItems.push({
            ...ele,
          });
        }
      });

      let embeddingItemsIndex = oldItems.findIndex(
        (ele) => ele.id === embedding
      );
      oldItems[embeddingItemsIndex] = {
        ...oldItems[embeddingItemsIndex],
        additionalInfo: {
          ...oldItems[embeddingItemsIndex].additionalInfo,
          layers: [
            ...(oldItems[embeddingItemsIndex].additionalInfo.layers || []),
            ...newLayers,
          ],
        },
      };
      return oldItems;
    });
    setEmbedding(null);
    setChecklistData({});
  };

  const attachLink = (title: string, link: string, linkState: any) => {
    thisBot.tryAddDataToPlaylist({
      dataItem: {
        content: title,
        additionalInfo: {
          link,
          ...linkState,
        },
        type: linkState.type === "text" ? "heading" : "attachment-link",
      },
    });
    G.setOpenAttachLink(false);
  };

  const onMassAdd = (items: any[]) => {
    items.forEach((item) => {
      thisBot.tryAddDataToPlaylist({
        dataItem: { ...item },
      });
    });
    G.setOpenAttachLink(false);
  };

  const deleteFromList = (id: string, pid?: string) => {
    if (singleMode && !editData?.address) {
      if (pid) {
        setEmbedItems((prev) => prev.filter((ele) => ele.id !== id));
      } else {
        setList([]);
      }
      setSelectedAnnotation(null);
      return;
    } else {
      if (pid) {
        setList((prev: any[]) => {
          const old = [...prev];
          const index = old.findIndex((ele) => ele.id === pid);
          if (index > -1) {
            old[index].additionalInfo.layers = old[
              index
            ].additionalInfo.layers.filter((ele: any) => ele.id !== id);
          }
          return old;
        });
      } else {
        setList((prev: any[]) => prev.filter((ele: any) => ele.id !== id));
      }
    }

    setSelectedAnnotation(null);
  };

  const deleteAttachment = (index: number, pID: string, id: string) => {
    if (singleMode && !editData?.address) {
      setEmbedItems((prev: any[]) => {
        let old: any[] = [...prev];
        old = old.filter((ele) => ele.id !== id);
        return old;
      });
      return;
    }
    setList((prev: any[]) => {
      const old = [...prev];
      const index = old.findIndex((ele) => ele.id === pID);
      if (index > -1) {
        old[index].additionalInfo.layers = old[
          index
        ].additionalInfo.layers.filter((ele: any) => ele.id !== id);
      }
    });
    setSelectedAnnotation(null);
  };

  const onAddTags = (tags: string[]) => {
    if (singleMode) {
      setTags((prev) => [...prev, ...tags]);
      return;
    }
    setList((old: any[]) => {
      const prev = [...old];
      const index = prev.findIndex((ele) => ele.id === selectedAnnotation);
      const targetVerse = prev[index];
      targetVerse.additionalInfo.tags = [
        ...tags,
        ...(targetVerse.additionalInfo.tags || []),
      ];
      prev[index] = targetVerse;
      return prev;
    });
  };

  const onRemoveTag = (indexofTag: number, idOfParent?: string) => {
    if (singleMode || editData?.address) {
      setTags((prev) => {
        const old = [...prev];
        old.splice(indexofTag, 1);
        return old;
      });
      return;
    }
    setList((old: any[]) => {
      const prev = [...old];
      const index = prev.findIndex((ele) => ele.id === idOfParent);
      const targetVerse = prev[index];
      targetVerse.additionalInfo.tags.splice(indexofTag, 1);
      prev[index] = { ...targetVerse };
      return prev;
    });
  };

  const onDisembed = (ids: any[], isDelete?: boolean) => {
    let idtoDisembed = [ids];
    if (Array.isArray(ids)) {
      idtoDisembed = [...ids];
    }

    const idsMap: Record<string, boolean> = {};
    const pidsMap: Record<string, boolean> = {};

    idtoDisembed.forEach((ele: any, index: number) => {
      idsMap[ele.idFinal] = true;
      pidsMap[ele.pId] = true;
    });

    if (singleMode) {
      if (isDelete) {
        if (Object.keys(idsMap).length) {
          setEmbedItems((prev) => {
            let old = [...prev];
            old = old.filter((ele) => !idsMap[ele.id]);
            return old;
          });
        }

        setChecklistData({});
        setChecklistEmbeded({});
        return;
      }
      ShowNotification({
        message: t("youCannotUnlinkAttachmentsInAnnotationMode"),
        severity: "error",
      });
      return;
    }

    setList((prev: any[]) => {
      const toBeAddedAtIndex: Record<any, any[]> = {};

      const old = prev.map((ele: any, idx: number) => {
        const prevEle = {
          ...ele,
          additionalInfo: {
            ...ele.additionalInfo,
            layers: [...(ele.additionalInfo.layers || [])],
          },
        };
        const layersFilter: any[] = [];
        const remaningLayers: any[] = [];
        if (pidsMap[prevEle.id]) {
          prevEle.additionalInfo.layers.forEach((layer: any) => {
            if (idsMap[layer.id]) {
              layersFilter.push({
                ...layer,
              });
            } else {
              remaningLayers.push({
                ...layer,
              });
            }
          });
          prevEle.additionalInfo.layers = [...remaningLayers];
        }
        if (!isDelete) {
          toBeAddedAtIndex[idx] = [...layersFilter];
        }
        return prevEle;
      });
      Object.keys(toBeAddedAtIndex).forEach((ele: any) => {
        const items = [...(toBeAddedAtIndex[ele] || [])];
        old.splice(ele, 0, ...items);
      });
      return old;
    });
    setChecklistData({});
    setSelectedAnnotation(null);
    setChecklistEmbeded({});
  };

  const editDataFromPlaylist = (receivedIds: any[]) => {
    let ids = [receivedIds];
    if (Array.isArray(receivedIds)) {
      ids = [...receivedIds];
    }

    setChecklistData((prev) => {
      const old: Record<any, boolean> = { ...prev };
      ids.forEach((idEle: any) => {
        if (old[idEle]) {
          delete old[idEle];
        } else {
          old[idEle] = true;
        }
      });

      return old;
    });
  };

  const onCheckEmbeded = (id: any, pId: string) => {
    setChecklistEmbeded((prev) => {
      const old: Record<any, any> = { ...prev };
      let idMap = [id];
      if (Array.isArray(id)) {
        idMap = [...idMap];
      }
      idMap.forEach((idFinal) => {
        if (old[idFinal]) {
          delete old[idFinal];
        } else {
          old[idFinal] = { idFinal, pId };
        }
      });
      return old;
    });
  };

  const isSomethingChecked = Object.keys(checkListData).length > 0;

  const isSomethingEmbededChecked = Object.keys(checkListEmbeded).length > 0;

  const onBulkDeleteItems = () => {
    if (singleMode) {
      setList([]);
    } else {
      setList((prev: any[]) => {
        const old = prev.filter(
          (ele) => !checkListData[ele.id] && embedding !== ele.id
        );
        return old;
      });
    }
    setChecklistData({});
    setSelectedAnnotation(null);
    setEmbedding(null);
    setChecklistEmbeded({});
  };

  const onEditSave = async () => {
    // if (list.length < 1) {
    if (textHTML?.trim().length < 1) {
      return ShowNotification({
        message: t("cannotSaveEmptyAnnotation"),
        severity: "error",
      });
    }
    try {
      setLoading(true);
      const promisesArray = [];

      // const scripture = {
      //   id: createUUID(),
      //   content: textHTML,
      //   additionalInfo: {
      //     isValid: true,
      //   },
      //   type:  "heading"
      // };

      // TODO: @kushagra - the book and chapter info should be taken from the old annotation - not the data in the old annotation
      const book =
        editDataDetails.additionalInfo?.chapterData?.id ||
        editDataDetails.additionalInfo?.chapterData?.bookId ||
        editDataDetails.additionalInfo?.data?.id ||
        editDataDetails.additionalInfo?.data?.bookId;
      const chapter = editDataDetails?.additionalInfo?.chapter;

      const hashtags = extractHashtagsFromHTML(textHTML);

      const comment: any = {
        type: "comment",
        html: textHTML,
        createdAtMs: editDataDetails.createdAtMs ?? Date.now(),
        updatedAtMs: Date.now(),
        userId: editDataDetails.userId,
        userName: editDataDetails.userName,
        userProfilePicture: editDataDetails.userProfilePicture,
        tags: hashtags,

        // book:
        //   editDataDetails.additionalInfo.chapterData?.id ||
        //   editDataDetails.additionalInfo.chapterData?.bookId ||
        //   editDataDetails.additionalInfo?.data?.id ||
        //   editDataDetails.additionalInfo?.data?.bookId,
        // chapter: editDataDetails.additionalInfo.chapter,
        // translation: "",
        // chronicle_tags: [...(tags || [])],
        // data: {
        //   ...editDataDetails,
        //   additionalInfo: {
        //     ...editDataDetails.additionalInfo,
        //     // layers: [...list],
        //     layers: [scripture],
        //   },
        // },
      };

      const annotation = createAnnotation(
        book,
        chapter,
        comment,
        editDataDetails.additionalInfo?.verse
      );
      const userRecord = await getAnnotationRecord();
      promisesArray.push(
        saveAnnotation(userRecord, { ...annotation, id: isEditAddress })
      );
      await Promise.all(promisesArray);
      G.SelectedItemIDForAttachments = null;
      ShowNotification({
        message: t("annotationsSavedSuccessfully"),
        severity: "success",
      });
      setList([]);
      setSelectedAnnotation(null);
      setLoading(false);
      G.PreviousHTML = null;
      setTextHTML(null);
      if (setTab) setTab("discover");
      delete G.AnnotationsData[`${book}-${chapter}`];
      thisBot.fetchAnnotationsData({ ...G.CurrentBookData });
      G.LastEditingAnnotationAddress = null;
      thisBot.resetPlaylistGlobalStateVars();
    } catch (e) {
      setLoading(false);
      console.error(`${t("errorUpdatingAnnotations")}:`, e);
      ShowNotification({
        message: t("failedToUpdateAnnotations"),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const onClickSave = async () => {
    if (loading) return;
    // if (list.length < 1) {
    if (textHTML?.trim().length < 1) {
      return ShowNotification({
        message: t("cannotSaveEmptyAnnotations"),
        severity: "error",
      });
    }
    if (isEditAddress) {
      await onEditSave();
      return;
    }

    // const scripture = {
    //   id: createUUID(),
    //   content: textHTML,
    //   additionalInfo: {
    //     isValid: true,
    //   },
    //   type:  "heading"
    // };

    const currentList = [...list].filter((ele) =>
      singleMode
        ? ele.type === "verse" ||
          ele.type === "verse-range" ||
          ele.type === "verse-grouped"
        : true
    );
    const nonScriptureName: Record<string, boolean> = {
      date: true,
      "attachment-link": true,
      heading: true,
    };

    let somethingNotScripture = false;
    let somethingNotEmbedded = false;
    if (singleMode) {
      if (textHTML?.trim().length === 0) {
        return ShowNotification({
          message: t("pleaseEmbedSomethingToSaveAnnotations"),
          severity: "error",
        });
      }
    } else {
      currentList.forEach((ele) => {
        if (nonScriptureName[ele.type]) {
          somethingNotScripture = true;
        }
        if (!Array.isArray(ele.additionalInfo.layers)) {
          somethingNotEmbedded = true;
        }
      });

      if (somethingNotScripture) {
        return ShowNotification({
          message: t("onlyVersesAndChaptersAreAllowedForTopLevelAnnotation"),
          severity: "error",
        });
      }

      if (somethingNotEmbedded) {
        return ShowNotification({
          message: t("someOfYourScripturesAreNotEmbedded"),
          severity: "error",
        });
      }
    }

    setLoading(true);

    try {
      const promisesArray = [];
      const userRecord = await getAnnotationRecord();
      const singleRangeTrack: Record<string, boolean> = {};

      const data: any = await os.getData(
        thisBot.tags.keyFetchAccountData,
        authBot.id
      );

      const verseNumbers: number[] = [];

      const hashtags = extractHashtagsFromHTML(textHTML);

      const comment: any = {
        type: "comment",
        html: textHTML,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
        userProfilePicture: data.data?.photoLink,
        userName: data.data?.profileName,
        userId: authBot.id,
        tags: hashtags,
      };

      let book = "";
      let chapter = "";

      currentList.forEach((ele) => {
        if (
          ele.type !== "chapter-range" &&
          ele.type !== "chapter-grouped" &&
          !singleRangeTrack[ele.additionalInfo.verse]
        ) {
          if (singleMode) {
            singleRangeTrack[ele.additionalInfo.verse] = true;
          }
          book =
            ele.additionalInfo?.chapterData?.id ||
            ele.additionalInfo?.chapterData?.bookId ||
            ele.additionalInfo?.data?.id ||
            ele.additionalInfo?.data?.bookId;
          chapter = ele.additionalInfo.chapter;

          verseNumbers.push(ele.additionalInfo.verse);
        }
      });

      if (book && chapter && verseNumbers.length > 0) {
        const annotation = createAnnotation(
          book,
          Number(chapter),
          comment,
          verseNumbers.length > 1 ? verseNumbers : verseNumbers[0] || 0
        );

        promisesArray.push(saveAnnotation(userRecord, annotation));

        await Promise.all(promisesArray);

        setLoading(false);
        G.SelectedItemIDForAttachments = null;
        ShowNotification({
          message: t("annotationsSavedSuccessfully"),
          severity: "success",
        });
        setList([]);
        setSelectedAnnotation(null);
        G.PreviousHTML = null;
        delete G.AnnotationsData[`${book}-${chapter}`];
        thisBot.fetchAnnotationsData({ ...G.CurrentBookData });
        setTextHTML(null);
        thisBot.resetPlaylistGlobalStateVars();
      }
    } catch (e) {
      setLoading(false);
      console.error(`${t("errorSavingAnnotations")}:`, e);
      ShowNotification({
        message: t("failedToSaveAnnotations"),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkEnabled =
    checklistEnabled ||
    isSomethingChecked ||
    isSomethingEmbededChecked ||
    embedding;

  const toBeSetItems = useRef<any[]>([]);
  const [dragOverSet, setDragoverSetMutate] = useState({
    position: "top",
    itemId: null,
    pId: null,
  });

  const setDragoverSet = (newState: any) => {
    if (
      newState.itemId !== dragOverSet.itemId ||
      newState.position !== dragOverSet.position
    ) {
      if (G[`${newState.itemId}OpenToggle`]) {
        G[`${newState.itemId}OpenToggle`](true);
      }
      setDragoverSetMutate(newState);
    }
  };

  // const selectedCount = list.filter(ele => !!ele.readAlready);
  // const unSelectedCount = list.length - selectedCount;

  // const transformedHistory = useMemo(() => thisBot.groupVerse(list), [list, selectedCount, unSelectedCount]);

  const finalHistoryObject = useMemo(() => {
    if (!singleMode || editData?.address) return list;

    const trackVerse: Record<string, boolean> = {};

    const listItems: any[] = [];

    list.forEach((ele: any) => {
      const verse = ele.additionalInfo.verse;
      if (trackVerse[verse]) return false;
      trackVerse[verse] = true;
      if (
        ele.type === "verse" ||
        ele.type === "verse-range" ||
        ele.type === "verse-grouped"
      ) {
        if (ele.type === "verse-grouped") {
          ele.additionalInfo.verse.forEach((vNumber: number) => {
            if (trackVerse[vNumber]) return false;
            trackVerse[vNumber] = true;
            listItems.push({
              ...ele,
              additionalInfo: {
                ...ele.additionalInfo,
                verse: vNumber,
              },
            });
          });
        } else {
          listItems.push(ele);
        }
      }
    });

    const listFinal = listItems.sort(
      (a: any, b: any) => a.additionalInfo.verse - b.additionalInfo.verse
    );

    if (listFinal.length < 1) {
      setSelectedAnnotation(null);
      return listFinal;
    }
    const item = {
      content: listFinal[0].content,
      type: "chapter",
      additionalInfo: {
        ...listFinal[0],
      },
      id: "singleMode",
    };
    if (singleMode && listFinal.length) {
      setSelectedAnnotation("singleMode");
    } else {
      setSelectedAnnotation(null);
    }
    // Compress consecutive numbers into ranges
    const verses = listFinal
      .map((ele) => ele.additionalInfo.verse)
      .sort((a, b) => a - b);
    const ranges = G.GetVerseSummaryHeading(verses);

    item.content = `${item.content.split(":")[0]}:${ranges.join(", ")}`;

    return [item];
  }, [list, singleMode]);

  // console.log("finalHistoryObject", finalHistoryObject, list);

  const [draggedItemID, setDraggedItemID] = useState<string | null>(null);
  const [draggedParent, setDraggedItemParent] = useState<string | null>(null);

  const handleDragStart = (index: number, pId: string) => {
    toBeSetItems.current = finalHistoryObject;
    if (pId) {
      setDraggedItemParent(pId);
      const pIndex = finalHistoryObject.findIndex((ele: any) => ele.id === pId);
      const itemId = finalHistoryObject[pIndex].additionalInfo.layers[index].id;
      setDraggedItemID(itemId);
    } else {
      const id = finalHistoryObject[index].id;
      setDraggedItemID(id);
    }
    // console.log('Drag Start:', { index, pseudoID, id });
  };

  const handleDragOver = (
    index: number,
    pseudoIndex = 1,
    pseudoID = null,
    event: any
  ) => {
    event.preventDefault(); // Needed to allow drop

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseY = event.clientY;
    // const mouseX = event.clientX;

    const middleVertical = rect.top + rect.height / 2;
    // const middleHorizontal = rect.left + rect.width / 2;

    const distanceThreshold = 10; // pixels around the center

    const isNearCenter = Math.abs(mouseY - middleVertical) < distanceThreshold;

    if (!draggedItemID) return;

    let originalRespectiveIndex = index;

    let draggedItemIndex = finalHistoryObject.findIndex(
      (hist: any) => hist.id === draggedItemID
    );
    let parentIdx = finalHistoryObject.findIndex(
      (ele: any) => ele.id === draggedParent
    );

    let dragItem: any = [finalHistoryObject[draggedItemIndex]];

    if (draggedItemIndex === -1 && parentIdx > -1) {
      draggedItemIndex = finalHistoryObject[
        parentIdx
      ].additionalInfo.layers?.findIndex(
        (hist: any) => hist.id === draggedItemID
      );
      dragItem = [
        finalHistoryObject[parentIdx].additionalInfo.layers[draggedItemIndex],
      ];
    }

    let draggedOverItem = finalHistoryObject[index];

    if (pseudoID) {
      const parentIndexDragOver = finalHistoryObject.findIndex(
        (ele: any) => ele.id === pseudoID
      );
      draggedOverItem =
        finalHistoryObject[parentIndexDragOver].additionalInfo.layers[index];
    }

    let newIndex = originalRespectiveIndex;

    // console.log("Drag Over:", { newIndex, draggedItemIndex,originalRespectiveIndex, pseudoIndex, index });

    let newItems: any[] = [];

    let filterAbleItems = {
      [draggedItemID]: true,
    };

    // Ignore if the item is dragged over itself
    if (dragItem.id === draggedOverItem.id) {
      toBeSetItems.current = list;
      setDragoverSet({
        itemId: null,
        position: originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top",
      });
      return;
    }

    if (dragItem.id !== draggedOverItem.id) {
      setDragoverSet({
        itemId: draggedOverItem.id,
        position:
          isNearCenter && !pseudoID
            ? "Embed"
            : originalRespectiveIndex > draggedItemIndex
              ? "Bottom"
              : "Top",
      });
    }

    // Filter out the currently dragged item
    newItems = [
      ...finalHistoryObject.filter((hist: any) => !filterAbleItems[hist.id]),
    ];
    newItems = JSON.parse(JSON.stringify(newItems));
    if (parentIdx > -1) {
      newItems[parentIdx].additionalInfo.layers = [
        ...newItems[parentIdx].additionalInfo.layers.filter(
          (hist: any) => !filterAbleItems[hist.id]
        ),
      ];
    }
    if (pseudoID) {
      newItems[pseudoIndex].additionalInfo.layers.splice(
        newIndex,
        0,
        ...dragItem
      );
    } else if (isNearCenter) {
      const indexForNew = newItems.findIndex(
        (ele) => ele.id === draggedOverItem.id
      );
      // Add the dragged item after the dragged over item
      if (indexForNew > -1) {
        if (!newItems[indexForNew].additionalInfo.layers) {
          newItems[indexForNew].additionalInfo.layers = [];
        }
        newItems[indexForNew].additionalInfo.layers = [
          ...newItems[indexForNew].additionalInfo.layers,
          ...dragItem,
        ];
      }
    } else {
      // Add the dragged item after the dragged over item
      newItems.splice(newIndex, 0, ...dragItem);
    }

    toBeSetItems.current = newItems;
  };

  const handleDragEnd = () => {
    const dragOverItem = finalHistoryObject.find(
      (ele: any) => ele.id === dragOverSet.itemId
    );

    setDragoverSet({
      itemId: null,
      position: "false",
    });
    setDraggedItemID(null);
    setDraggedItemParent(null);

    if (dragOverSet.position === "Embed") {
      if (isEditAddress) {
        ShowNotification({
          message: t(
            "youAreInEditModeEditingANotationCannotEmbedItemsInsideTheAnnotation"
          ),
          severity: "error",
        });
        return;
      }

      if (
        dragOverItem?.type === "attachment-link" ||
        dragOverItem?.type === "heading"
      ) {
        ShowNotification({
          message: t("youCannotEmbedItemsIntoAttachmentItem"),
          severity: "error",
        });
        return;
      }

      let draggedItemIndex = finalHistoryObject.findIndex(
        (hist: any) => hist.id === draggedItemID
      );

      let dragItem = finalHistoryObject[draggedItemIndex];

      let parentIdx = finalHistoryObject.findIndex(
        (ele: any) => ele.id === draggedParent
      );

      if (draggedItemIndex === -1 && parentIdx > -1) {
        draggedItemIndex = finalHistoryObject[
          parentIdx
        ].additionalInfo.layers?.findIndex(
          (hist: any) => hist.id === draggedItemID
        );
        dragItem =
          finalHistoryObject[parentIdx].additionalInfo.layers[draggedItemIndex];
      }

      if (dragItem.additionalInfo.layers?.length) {
        ShowNotification({
          message: t("cannotEmbedEmbeddedItem"),
          severity: "error",
        });
        return;
      }
    }
    toBeSetItems.current && setList(toBeSetItems.current);
  };

  const showMorePosition = useRef(getPosition());

  const showPlaylistPosition = useRef(getPosition());

  const AnnotationIconI = useMemo(() => {
    return G.AnnotationIcon;
  }, []);

  useLayoutEffect(() => {
    if (!singleMode) {
      setList((prev: any[]) => {
        let old = [...prev];
        old = old.map((ele) => {
          return {
            ...ele,
            additionalInfo: {
              ...ele.additionalInfo,
              layers: [...embedItems],
              tags: [...tags],
            },
          };
        });
        return old;
      });
      setSelectedAnnotation(null);
    } else {
      setList((prev: any[]) => {
        let old = [...prev];
        old = old.map((ele) => {
          return {
            ...ele,
            additionalInfo: {
              ...ele.additionalInfo,
              layers: [],
              tags: [],
            },
          };
        });
        return old;
      });
    }
  }, [singleMode]);

  return (
    <>
      {loseProgresss && (
        <Modal
          showIcon={false}
          onClose={() => {
            setLoseProgresss(false);
          }}
        >
          <h2 style={{ fontSize: "1rem" }}>{t("embeddedItemsWillBeLost")}</h2>
          <p>
            t('switchingToAnotherModeWillLoseTheEmbeddedItemsDoYouWantToContinue')
          </p>
          <ButtonsCover>
            <Button
              secondaryAlt
              onClick={() => {
                loseProgressAction.current?.();
              }}
              variant="black"
            >
              {t("confirm")}
            </Button>
            <Button
              secondary
              onClick={() => {
                setLoseProgresss(false);
              }}
            >
              {t("no")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      {showPlaylistSettings && (
        <>
          <div
            className="backdrop"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();

              const x = rect.left; // X position where the element starts (from left of screen)
              const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

              G.LastClickX = x;
              G.LastClickY = y;
              setShowPlaylistSettings(false);
            }}
          />
          <div
            style={{
              ...showPlaylistPosition.current,
              width: "220px",
              padding: "1rem",
            }}
            className="overlay linked-item-custom"
          >
            <div
              className="more-menu-items active"
              onClick={() => {
                setMode(G.PlaylistModeTypes.annotations);
                setShowPlaylistSettings(false);
              }}
            >
              <div className="align-center">
                <span
                  style={{ fontSize: "20px" }}
                  class="material-symbols-outlined"
                >
                  draft
                </span>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginLeft: "4px",
                  }}
                  for="playlistInclude"
                >
                  {t("annotationMode")}
                </label>
              </div>
              <Tooltip forRight={true} text={t("annotationModeTooltip")}>
                <p
                  className="what-this center"
                  style={{ margin: "0 0 0 0.5rem" }}
                >
                  <span
                    style={{ fontSize: "24px" }}
                    class="material-symbols-outlined unfollow"
                  >
                    info
                  </span>
                </p>
              </Tooltip>
            </div>
            <div
              className="more-menu-items"
              onClick={() => {
                // @ts-expect-error - loseProgressAction is not typed
                loseProgressAction.current = () => {
                  setList((prev: any[]) => {
                    let old = [...prev];
                    old = old.filter(
                      (ele) => ele.additionalInfo.type !== "playlist"
                    );
                    old = old.map((ele) => {
                      const eleprev = { ...ele };
                      if (eleprev.additionalInfo.layers) {
                        eleprev.additionalInfo.layers =
                          eleprev.additionalInfo.layers.filter(
                            (ele: any) => ele.additionalInfo.type !== "playlist"
                          );
                      }
                      return eleprev;
                    });
                    return old;
                  });
                  setMode(G.PlaylistModeTypes.playlist);
                };
                if (singleMode && embedItems.length > 0) {
                  setLoseProgresss(true);
                } else {
                  loseProgressAction.current?.();
                }
                setShowPlaylistSettings(false);
              }}
            >
              <div className="align-center">
                <span
                  style={{ fontSize: "20px" }}
                  class="material-symbols-outlined"
                >
                  playlist_play
                </span>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginLeft: "4px",
                  }}
                  for="playlistInclude"
                >
                  {t("playlistMode")}
                </label>
              </div>
              <Tooltip forRight={true} text={t("playlistModeTooltip")}>
                <p
                  className="what-this center"
                  style={{ margin: "0 0 0 0.5rem" }}
                >
                  <span
                    style={{ fontSize: "24px" }}
                    class="material-symbols-outlined unfollow"
                  >
                    info
                  </span>
                </p>
              </Tooltip>
            </div>
            {DEV_ENV && (
              <div
                className="more-menu-items"
                onClick={() => {
                  // @ts-expect-error - loseProgressAction is not typed
                  loseProgressAction.current = () => {
                    setList((prev: any[]) => {
                      let old = [...prev];
                      old = old.filter(
                        (ele) => ele.additionalInfo.type === "playlist"
                      );
                      old = old.map((ele) => {
                        const eleprev = { ...ele };
                        if (eleprev.additionalInfo.layers) {
                          eleprev.additionalInfo.layers =
                            eleprev.additionalInfo.layers.filter(
                              (ele: any) =>
                                ele.additionalInfo.type === "playlist"
                            );
                        }
                      });
                      return old;
                    });
                    setMode(G.PlaylistModeTypes.project);
                  };
                  if (singleMode && embedItems.length > 0) {
                    setLoseProgresss(true);
                  } else {
                    loseProgressAction.current?.();
                  }
                  setShowPlaylistSettings(false);
                }}
              >
                <div className="align-center">
                  <span
                    style={{ fontSize: "20px" }}
                    class="material-symbols-outlined"
                  >
                    team_dashboard
                  </span>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      marginLeft: "4px",
                    }}
                    for="playlistInclude"
                  >
                    {t("projectMode")}
                  </label>
                </div>
                <Tooltip forRight={true} text={t("projectModeTooltip")}>
                  <p
                    className="what-this center"
                    style={{ margin: "0 0 0 0.5rem" }}
                  >
                    <span
                      style={{ fontSize: "24px" }}
                      class="material-symbols-outlined unfollow"
                    >
                      info
                    </span>
                  </p>
                </Tooltip>
              </div>
            )}
          </div>
        </>
      )}
      {showMoreOptions && (
        <>
          <div className="backdrop" onClick={() => setShowMoreOptions(false)} />
          <div
            onClick={() => setShowMoreOptions(false)}
            style={{
              ...showMorePosition.current,
              left: "none",
              right: "4rem",
              width: "240px",
              padding: "1rem",
              top: "5rem",
            }}
            className="overlay linked-item-custom"
          >
            <p>
              <b>{t("publishSettings")}</b>
            </p>
            <span style={{ fontSize: "10px" }}>{t("publishSettingsDesc")}</span>
            <div
              className="more-menu-items"
              onClick={() => {
                setPublishAccess("private");
              }}
            >
              <span class="material-symbols-outlined">lock</span>
              <p>{t("privateAccess")}</p>
              <span class="material-symbols-outlined">
                {publishAccess === "private"
                  ? "radio_button_checked"
                  : "radio_button_unchecked"}
              </span>
            </div>
            <div
              className="more-menu-items"
              onClick={() => {
                setPublishAccess("public");
              }}
            >
              <span class="material-symbols-outlined">public</span>
              <p>{t("publicAccess")}</p>
              <span class="material-symbols-outlined">
                {publishAccess === "public"
                  ? "radio_button_checked"
                  : "radio_button_unchecked"}
              </span>
            </div>

            {false && (
              <div
                className="more-menu-items"
                onClick={() => {
                  setSingleMode((p) => !p);
                }}
              >
                <span class="material-symbols-outlined">
                  auto_awesome_motion
                </span>
                <p>{t("advancedUI")}</p>
                <span class="material-symbols-outlined">
                  {!singleMode
                    ? "radio_button_checked"
                    : "radio_button_unchecked"}
                </span>
              </div>
            )}
          </div>
        </>
      )}
      <div
        style={{
          flexGrow: "1",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isEditAddress ? (
          <>
            <div
              className="align-center justify-between"
              style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
            >
              <div
                className="back-button"
                onClick={() => {
                  if (isEditAddress) setList([]);
                  setIsEditAddress(false);
                  G.SetEditAnnoData?.(null);
                  thisBot.resetPlaylistGlobalStateVars();
                  if (setTab) setTab("discover");
                }}
              >
                <span class="material-symbols-outlined">
                  keyboard_backspace
                </span>
                <span>{t("backToDiscover")}</span>
              </div>
            </div>
            <h4 style={{ margin: "8px 0" }}>
              {t("editingAnnotationFor")} {editData.title}
            </h4>
            {!!tags.length && (
              <div style={{ display: "flex" }}>
                <p
                  style={{
                    padding: "1rem",
                    fontSize: "1rem",
                    fontWeight: "700",
                  }}
                >
                  {t("tags")}:
                </p>
                <div
                  className="align-center"
                  style={{
                    flexWrap: "wrap",
                    flexGrow: "1",
                    margin: "0.5rem 0",
                    gap: "0.5rem",
                  }}
                >
                  {tags.map((ele, index) => (
                    <Chips
                      label={ele}
                      key={index}
                      onDelete={() => {
                        onRemoveTag(index);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            className="align-center justify-between"
            style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
          >
            <div className="align-center" style={{ gap: "0.5rem" }}>
              <div
                className="publish-setting"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();

                  const x = rect.left; // X position where the element starts (from left of screen)
                  const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

                  G.LastClickX = x;
                  G.LastClickY = y;
                  showPlaylistPosition.current = { ...getPosition() };
                  // setShowPlaylistSettings(true);
                }}
              >
                <AnnotationIconI />
              </div>
              <p>
                {singleMode
                  ? finalHistoryObject[0]?.content || t("annotations")
                  : t("annotationMode")}
              </p>
            </div>
            <div className="align-center">
              {list.length > 0 && (
                <div
                  className="publish-setting"
                  style={{
                    fontSize: "12px",
                    marginRight: "0.5rem",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setList((prev: any[]) => {
                      const old = [...prev];
                      old.pop();
                      return old;
                    });
                  }}
                >
                  <span class="material-symbols-outlined">undo</span>
                </div>
              )}
              <div
                className="publish-setting"
                style={{
                  fontSize: "12px",
                  marginRight: "0.5rem",
                }}
                onClick={(e) => {
                  thisBot.resetPlaylistGlobalStateVars();
                  setList([]);
                  G.PreviousHTML = null;
                  setTextHTML(null);
                  G[`${id}currentPlaylist`] = [];
                  if (setTab) setTab("discover");
                  G.AddAnotationUI = false;
                }}
              >
                {t("cancel")}
              </div>
              <TogglePlaylistHeight />
            </div>
          </div>
        )}

        {(isSomethingChecked || embedding) && (
          <div
            style={{ justifyContent: "space-between", margin: "0.5rem 0" }}
            className="align-center"
          >
            <Button
              onClick={() => {
                onBulkDeleteItems();
                if (isSomethingEmbededChecked) {
                  const values = Object.keys(checkListEmbeded).map(
                    (ele) => checkListEmbeded[ele]
                  );
                  onDisembed(values, true);
                }
              }}
              secondaryAlt
              color="#C20104"
            >
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                delete_forever
              </span>
              <span className="color-inherit">{t("delete")}</span>
            </Button>
            {!!embedding &&
              !isEditAddress &&
              isSomethingChecked &&
              !isSomethingEmbededChecked && (
                <Button
                  onClick={onEmbedInside}
                  secondaryAlt
                  color="var(--secondaryColor)"
                >
                  <span
                    style={{ marginRight: "0.5rem" }}
                    class="material-symbols-outlined unfollow color-inherit"
                  >
                    frame_source
                  </span>
                  <span className="color-inherit">{t("embed")}</span>
                </Button>
              )}
            <Button
              onClick={() => {
                setEmbedding(false);
                setChecklistData({});
                setChecklistEmbeded({});
              }}
              secondaryAlt
            >
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                close
              </span>
              <span className="color-inherit">{t("cancel")}</span>
            </Button>
          </div>
        )}
        {isSomethingEmbededChecked && !isSomethingChecked && (
          <div
            style={{ justifyContent: "space-between", margin: "0.5rem 0" }}
            className="align-center"
          >
            <Button
              onClick={() => {
                const values = Object.keys(checkListEmbeded).map(
                  (ele) => checkListEmbeded[ele]
                );
                onDisembed(values, true);
              }}
              secondaryAlt
              color="#C20104"
            >
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                delete_forever
              </span>
              <span className="color-inherit">{t("delete")}</span>
            </Button>
            {!singleMode && (
              <Button
                onClick={() => {
                  const values = Object.keys(checkListEmbeded).map(
                    (ele) => checkListEmbeded[ele]
                  );
                  onDisembed(values);
                }}
                secondaryAlt
                color="var(--secondaryColor)"
              >
                <span
                  style={{ marginRight: "0.5rem" }}
                  class="material-symbols-outlined unfollow color-inherit"
                >
                  link_off
                </span>
                <span className="color-inherit">{t("remove")}</span>
              </Button>
            )}
            <Button
              onClick={() => {
                setChecklistEmbeded({});
              }}
              secondaryAlt
            >
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                close
              </span>
              <span className="color-inherit">{t("cancel")}</span>
            </Button>
          </div>
        )}
        {dataFetching && (
          <div
            className="align-center"
            style={{ gap: "1rem", margin: "0.5rem 0" }}
          >
            <LoaderSecondary />
            <p>{t("fetchingAnnotationData")}</p>
          </div>
        )}
        {finalHistoryObject.length === 0 && !dataFetching && !isEditAddress && (
          <p style={{ margin: "1rem 0" }}>{t("addItemsToStartAnnotating")}</p>
        )}
        {finalHistoryObject.map((ele: any, index: number) =>
          ele.type === "attachment-link" || ele.type === "date" ? (
            <AttachmentLinkItem
              linkingMode={false}
              isPlaylistNestedSupported
              viewOnly={false}
              isEditAddress={isEditAddress}
              isSomethingEmbededChecked={isSomethingEmbededChecked}
              datesRepeat={false}
              datesInWrongOrder={false}
              playlistName={false}
              currentFormat={false}
              readingPlanEnabled={false}
              layers={false}
              draggable={true}
              oldItemsMap={{}}
              currentDateActive={false}
              originalIndex={-1}
              dragOverSet={dragOverSet}
              activeItemID={false}
              clickPass={false}
              checked={false}
              activeItemList={{}}
              onClick={() => {}}
              playlistId={false}
              onClickItem={() => {}}
              checklistEnabled={checkEnabled}
              checkListData={checkListData}
              creatingPlaylist={true}
              index={index}
              editDataFromPlaylist={editDataFromPlaylist}
              embedding={embedding}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDragEnd={handleDragEnd}
              toggle={false}
              setList={setList}
              pId={null}
              originalList={finalHistoryObject}
              playListSubIndex={false}
              deleteFromList={(_: any, __: any, id: string) => {
                deleteFromList(id);
              }}
              key={`${ele.id}-${ele.readAlready}`}
              playingPlaylist={false}
              data={ele}
              onDisembed={false}
            />
          ) : (
            <>
              {!singleMode && (
                <AnnotationInnerDiv
                  isEditAddress={isEditAddress}
                  dragOverSet={dragOverSet}
                  onDisembed={onDisembed}
                  embedding={embedding}
                  setChecklistEmbeded={onCheckEmbeded}
                  finalHistoryObject={finalHistoryObject}
                  checklistEnabled={checkEnabled}
                  checkListEmbeded={checkListEmbeded}
                  setList={setList}
                  isSomethingEmbededChecked={isSomethingEmbededChecked}
                  selectedAnnotation={selectedAnnotation}
                  checkListData={checkListData}
                  editDataFromPlaylist={editDataFromPlaylist}
                  index={index}
                  pId={null}
                  handleDragStart={handleDragStart}
                  handleDragOver={handleDragOver}
                  handleDragEnd={handleDragEnd}
                  onRemoveTag={onRemoveTag}
                  deleteAttachment={deleteAttachment}
                  singleMode={singleMode}
                  setEmbedding={setEmbedding}
                  deleteFromList={deleteFromList}
                  selected={ele.id === selectedAnnotation}
                  data={{
                    ...ele,
                    additionalInfo: {
                      ...ele.additionalInfo,
                      layers: [
                        ...(ele.id === "singleMode"
                          ? embedItems
                          : ele.additionalInfo.layers || []),
                      ],
                      tags: [
                        ...(ele.id === "singleMode"
                          ? tags
                          : ele.additionalInfo.tags || []),
                      ],
                    },
                  }}
                  key={ele.id}
                  onClick={(id: string) => {
                    if (isEditAddress) {
                      ShowNotification({
                        message: t(
                          "youAreInEditModeEditingANotationCannotEmbedItemsInsideTheAnnotation"
                        ),
                        severity: "error",
                      });
                      return;
                    }
                    if (ele.type !== "heading" && !checkEnabled) {
                      const isMultiFunctionHold = G.CheckMultiFuntionHold();
                      if (!isMultiFunctionHold) {
                        if (!singleMode) {
                          setSelectedAnnotation((prev: string | null) =>
                            prev === id ? null : id
                          );
                        }
                      } else if (embedding) {
                        // const isShiftHold = globalThis?.KEY_HOLD?.['shift'];
                        // if (isShiftHold && id === globalThis.LAST_CLICK_EMBED_PARENT) {
                        //     let upperLimit = Math.max(index, globalThis.LAST_CLICK_EMBED_ID);
                        //     let lowerLimit = Math.min(index, globalThis.LAST_CLICK_EMBED_ID);
                        //     const idsFilter = data.additionalInfo.layers.filter(({ id }, indexInner) => indexInner <= upperLimit && indexInner >= lowerLimit && indexInner !== globalThis.LAST_CLICK_EMBED_ID && id !== embedding).map(ele => ele.id);
                        //     setChecklistEmbeded(idsFilter, false);
                        //     globalThis.LAST_CLICK_EMBED_PARENT = data.id;
                        //     globalThis.LAST_CLICK_EMBED_ID = index;
                        //     return;
                        // } else {
                        //     globalThis.LAST_CLICK_EMBED_PARENT = data.id;
                        //     globalThis.LAST_CLICK_EMBED_ID = index;
                        // }
                        // setChecklistEmbeded(ele.id, data.id);
                      }
                    }
                  }}
                />
              )}
              {!draggedItemID &&
                !dataFetching &&
                selectedAnnotation === ele.id &&
                !embedding && (
                  <div style={{ padding: "1rem 1rem 0 1rem" }}>
                    <CustomAnnotationTextEditor
                      isEditAddress={isEditAddress}
                      showPreview={showPreview}
                      setShowPreview={setShowPreview}
                      initialHTML={textHTML}
                      onChange={(html: string) => {
                        setTextHTML(html);
                      }}
                    />
                  </div>
                )}
            </>
          )
        )}

        {!selectedAnnotation &&
          !dataFetching &&
          (!singleMode || editData?.address) &&
          !draggedItemID &&
          !embedding && (
            <CustomAnnotationTextEditor
              showPreview={showPreview}
              setShowPreview={setShowPreview}
              initialHTML={textHTML}
              onChange={(html: string) => {
                setTextHTML(html);
              }}
            />
          )}

        {!!videoSrc && (
          <VideoPlayer videoSrc={videoSrc} playlistItem={{ ...currentItem }} />
        )}
        {!!mediaURL && <AudioPlayer close mediaURL={mediaURL} />}

        <div style={{ padding: "0 0.25rem" }}>
          <div className="add-playlist-actions row">
            <Button
              style={{
                width: "max-content",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0 0.5rem",
              }}
              secondaryAlt={!showPreview}
              secondary={showPreview}
              isOutline
              onClick={() => {
                if (G.TogglePreview) {
                  G.TogglePreview();
                }
              }}
            >
              <img
                className="img-icon"
                src={showPreview ? PREVIEW_ICON_ACTIVE : PREVIEW_ICON_INACTIVE}
                alt="Preview"
              />
              <span style={{ color: "inherit" }}>{t("preview")}</span>
            </Button>
            <Button
              style={{
                width: "max-content",
              }}
              onClick={onClickSave}
              secondary
            >
              {loading ? t("saving") : t("save")}
            </Button>
            {false && (
              <Button
                onClick={() => {
                  if (onReset && !loading) {
                    onReset();
                  }
                }}
                secondaryAlt
              >
                {t("close")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

return AddAnotationUI;
