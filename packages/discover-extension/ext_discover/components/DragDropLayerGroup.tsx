import { AttachmentLinkItem } from "ext_discover.components.AttachmentLinkItem";
import { AttachLink } from "ext_discover.components.AttachLink";
import { LinkingItems } from "ext_discover.components.LinkingItems";
import { RenderHTMLContent } from "ext_discover.components.RenderHTMLContent";
import { showQuoteText } from "ext_discover.helper.showQuoteText";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import { getDragDropLayerGroupManager } from "ext_discover.managers.DragDropLayerGroupManager";
import type { DragDropLayerGroupProps } from "ext_discover.interfaces.components.DragDropLayerGroup";
import { Checkbox } from "ext_discover.features.components.Checkbox";

const G = globalThis as Record<string, any>;
const isMobile = isMobilePlaylistViewport();

export function DragDropLayerGroup({
  manager,
  dragManager,
  setItemSelected,
  datesRepeat,
  itemSelected,
  attachLink,
  massAdd,
  datesInWrongOrder,
  currentFormat,
  draggedItemID,
  readingPlanEnabled,
  currentDateActive,
  setList,
  transformedHistory,
  playListSubIndex,
  isSomethingEmbededChecked,
  checkListEmbeded,
  setChecklistEmbeded,
  onDisembed,
  setRef,
  layers = true,
  embedding,
  setEmbedding,
  originalIndex,
  clickPass,
  activeItemID,
  activeItemList,
  oldItemsMap = {},
  playListSubId,
  data,
  viewOnly,
  linkingMode,
  creatingPlaylist,
  checkListData = {},
  checklistEnabled,
  playlistName,
  editDataFromPlaylist,
  type,
  toggle,
  playingPlaylist,
  greyOut,
  content,
  id,
  additionalInfo,
  index,
  onClickItem = () => {},
  onClick = () => {},
  deleteFromList,
  dragOverSet,
  isAdditionalInfo,
  isDeleteShow,
}: DragDropLayerGroupProps) {
  const layerManager = manager ?? getDragDropLayerGroupManager(id);
  const open = layerManager.open.value;

  const itemToBeShared = layers ? [data] : additionalInfo;

  const toBeMapArray = layers
    ? additionalInfo.layers || []
    : additionalInfo || [];

  const isChecked = itemToBeShared.every(
    (ele: any) => ele.readAlready || checkListData?.[ele.id]
  );

  const isGreyout = itemToBeShared.every((ele: any) => oldItemsMap?.[ele.id]);
  const isActive = itemToBeShared.some(
    (ele: any) => ele.id === activeItemID || activeItemList?.[ele.id]
  );
  const allIds = itemToBeShared.map((ele: any) => ele.id);

  layerManager.syncAutoOpenContext({
    activeItemID,
    activeItemList,
    isActive,
    data,
  });

  const extraClasses = `${(toggle === id || activeItemID === id || activeItemList?.[id] || isActive) && "current-playing-item"} ${(greyOut || oldItemsMap?.[id] || isGreyout) && "greyed-out"} ${embedding === data.id ? "embedding-on" : ""} ${dragOverSet.itemId === id && `dropabble-${dragOverSet.position}`}`;

  return (
    <div>
      <div
        draggable={!playingPlaylist && !viewOnly}
        tabIndex={0}
        className={`history-item ${extraClasses}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!viewOnly) {
            const isMultiFunctionHold = CheckMultiFuntionHold();

            if (!isMultiFunctionHold && !checklistEnabled)
              setItemSelected((prev: any) =>
                prev === data.id ? null : data.id
              );
          }
        }}
        onPointerUp={() => {
          if (layerManager.getDragged()) {
            layerManager.setDragged(false);
          }
          if (G.ADDING_TOPLAYLIST_TIMEOUT) {
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
            G.ADDING_TOPLAYLIST_TIMEOUT = null;
          }
        }}
        onMouseLeave={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
        }}
        onTouchEnd={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={() => {
          layerManager.setDragged(true);
          dragManager.handleDragStart(index, undefined, {
            transformedHistory,
            list: transformedHistory,
          });
        }}
        onDragOver={(e) =>
          dragManager.handleDragOver(index, null, null, e, {
            transformedHistory,
            list: transformedHistory,
          })
        }
        onDragEnd={() =>
          dragManager.handleDragEnd({
            transformedHistory,
            list: transformedHistory,
            setList,
          })
        }
      >
        <input
          style={{
            opacity: "0",
            "pointer-events": "none",
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: -1,
          }}
          placeholder={"test"}
          ref={(ref) => {
            if (setRef && setRef[id]) {
              setRef[id].current = ref;
            }
          }}
        />
        <div className="start-actions">
          {checklistEnabled && !viewOnly ? (
            <Checkbox
              checked={isChecked || embedding === data.id}
              disabled={embedding === data.id}
              small
              onClick={() => {
                const isShiftHold = G?.KEY_HOLD?.["shift"];
                if (isShiftHold) {
                  let upperLimit = Math.max(index, G.LAST_CLICK_ID);
                  let lowerLimit = Math.min(index, G.LAST_CLICK_ID);
                  const idsFilter = transformedHistory
                    .filter(
                      (el: any, indexInner: number) =>
                        indexInner <= upperLimit &&
                        indexInner >= lowerLimit &&
                        indexInner !== G.LAST_CLICK_ID &&
                        el.id !== embedding
                    )
                    .map((ele: any) => ele.id);
                  editDataFromPlaylist?.(idsFilter, false);
                  G.LAST_CLICK_ID = index;
                  return;
                } else {
                  G.LAST_CLICK_ID = index;
                }
                if (!embedding && layers && !playingPlaylist) {
                  if (G.KEY_HOLD?.["control"] || G.KEY_HOLD?.["meta"]) {
                    setEmbedding?.(data.id);
                    return;
                  }
                }
                editDataFromPlaylist?.(allIds, false);
              }}
            />
          ) : null}
          {false && (
            <span class="material-symbols-outlined unfollow drag-item-icon">
              table_view
            </span>
          )}
        </div>

        {!isAdditionalInfo &&
          toBeMapArray.map((layerData: any) => (
            <input
              key={layerData.id}
              style={{
                opacity: "0",
                "pointer-events": "none",
                position: "absolute",
                left: 0,
                top: 0,
                zIndex: -1,
              }}
              placeholder={"test"}
              ref={(ref) => {
                if (setRef && setRef[layerData.id]) {
                  setRef[layerData.id].current = ref;
                }
              }}
            />
          ))}

        <p
          onClick={() => {
            if (layerManager.getDragged()) {
              layerManager.setDragged(false);
            }
            if (!viewOnly) {
              clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
              G.ADDING_TOPLAYLIST_TIMEOUT = null;
              onClick({ dataItem: itemToBeShared, bulkAdd: true, index });
              if (checklistEnabled) {
                editDataFromPlaylist?.(allIds);
              }
            }
            if (clickPass) {
              G.ADDING_TOPLAYLIST_TIMEOUT = null;
              onClick({ dataItem: itemToBeShared, bulkAdd: true, index });
              if (checklistEnabled && !checkListData[data.id]) {
                editDataFromPlaylist?.(allIds);
              }
            }
          }}
          style={{
            border: data.id === itemSelected ? "1px solid #D36433" : "",
            backgroundColor: data.id === itemSelected ? "#D364334D" : "",
          }}
          className={`playlist-item-type ${checklistEnabled && !viewOnly ? "" : "no-left-padding"} playlist-item-${type}`}
        >
          {content}
        </p>
        <div
          className="actions"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {!playingPlaylist &&
            layers &&
            !embedding &&
            creatingPlaylist &&
            !viewOnly && (
              <p
                className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEmbedding?.(data.id);
                }}
              >
                <span class="material-symbols-outlined">pip</span>
              </p>
            )}
          {((creatingPlaylist && !viewOnly) || isDeleteShow) && (
            <p className="without-right-margin end-icon">
              <span
                onClick={() => {
                  deleteFromList(
                    itemToBeShared.map((layerData: any) => layerData.id)
                  );
                }}
                class="material-symbols-outlined unfollow delete-icon"
              >
                delete
              </span>
            </p>
          )}
          {!isAdditionalInfo && toBeMapArray.length > 0 && (
            <p className="without-right-margin end-icon visible">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (!layerManager.getDragged()) {
                    layerManager.toggleOpen();
                  }
                }}
                className="material-symbols-outlined unfollow"
                style={{ fontSize: "1.2rem" }}
              >
                {open ? "collapse_content" : "expand_content"}
              </span>
            </p>
          )}
        </div>
      </div>
      <div
        style={{
          height: open ? "auto" : "0",
          transition: "all 0.2s linear",
          overflow: "hidden",
          padding: "0 8px",
        }}
      >
        {!isAdditionalInfo &&
          toBeMapArray.map((layerData: any, layerIndex: number) => {
            const isTextType =
              layerData.type === "heading" || layerData.type === "text";
            const isQuotedText = layerData.additionalInfo.isQuotedText;
            return layerData.type === "attachment-link" ||
              layerData.type === "date" ? (
              <AttachmentLinkItem
                linkingMode={linkingMode}
                viewOnly={viewOnly}
                isSomethingEmbededChecked={isSomethingEmbededChecked}
                datesRepeat={datesRepeat}
                datesInWrongOrder={datesInWrongOrder}
                playlistName={playlistName}
                isDeleteShow={isDeleteShow}
                currentFormat={currentFormat}
                autoPlayToggle={(origIdx, pId, layerId) =>
                  dragManager.autoPlayToggle(origIdx, pId, layerId, setList)
                }
                toggleIsQuoteText={(layerId, pId) =>
                  dragManager.toggleIsQuoteText(layerId, pId, setList)
                }
                readingPlanEnabled={readingPlanEnabled}
                layers={layers}
                dragOverSet={dragOverSet}
                draggable={!playingPlaylist}
                oldItemsMap={oldItemsMap}
                currentDateActive={currentDateActive}
                originalIndex={originalIndex}
                activeItemID={activeItemID}
                clickPass={clickPass}
                setRef={setRef}
                checked={
                  layers
                    ? !!checkListEmbeded?.[layerData.id]
                    : checkListData?.[layerData.id] || layerData.readAlready
                }
                activeItemList={activeItemList}
                onClick={onClick}
                playlistId={playListSubId}
                onClickItem={onClickItem}
                checklistEnabled={checklistEnabled}
                checkListData={checkListData}
                creatingPlaylist={creatingPlaylist}
                index={layerIndex}
                editDataFromPlaylist={editDataFromPlaylist}
                handleDragStart={(layerIdx, pId) =>
                  dragManager.handleDragStart(layerIdx, pId, {
                    transformedHistory,
                    list: transformedHistory,
                  })
                }
                embedding={embedding}
                handleDragOver={(layerIdx, origIdx, nullArg, e) =>
                  dragManager.handleDragOver(layerIdx, origIdx, id, e, {
                    transformedHistory,
                    list: transformedHistory,
                  })
                }
                toggle={toggle}
                setList={setList}
                pId={id}
                handleDragEnd={() =>
                  dragManager.handleDragEnd({
                    transformedHistory,
                    list: transformedHistory,
                    setList,
                  })
                }
                originalList={transformedHistory}
                playListSubIndex={playListSubIndex}
                deleteFromList={deleteFromList}
                key={`${layerData.id}-${layerData.readAlready}`}
                playingPlaylist={playingPlaylist}
                data={layerData}
                onClickCheckbox={() => {
                  const isShiftHold = G?.KEY_HOLD?.["shift"];
                  if (isShiftHold && id === G.LAST_CLICK_EMBED_PARENT) {
                    let upperLimit = Math.max(
                      layerIndex,
                      G.LAST_CLICK_EMBED_ID
                    );
                    let lowerLimit = Math.min(
                      layerIndex,
                      G.LAST_CLICK_EMBED_ID
                    );
                    const idsFilter = toBeMapArray
                      .filter(
                        (el: any, indexInner: number) =>
                          indexInner <= upperLimit &&
                          indexInner >= lowerLimit &&
                          indexInner !== G.LAST_CLICK_EMBED_ID &&
                          el.id !== embedding
                      )
                      .map((ele: any) => ele.id);
                    setChecklistEmbeded?.(idsFilter, id, false);
                    G.LAST_CLICK_EMBED_PARENT = id;
                    G.LAST_CLICK_EMBED_ID = layerIndex;

                    return;
                  } else {
                    G.LAST_CLICK_EMBED_PARENT = id;
                    G.LAST_CLICK_EMBED_ID = layerIndex;
                  }
                  if (layers) {
                    setChecklistEmbeded?.(layerData.id, id);
                  } else {
                    editDataFromPlaylist?.(layerData.id, false);
                  }
                }}
                onDisembed={() => {
                  onDisembed?.({ id: layerData.id, pId: id });
                }}
                justPlay={!playingPlaylist}
              />
            ) : (
              <div
                key={`${layerData.id}-${layerData.readAlready}`}
                style={{ display: layerData.id === id ? "none" : "" }}
                draggable={!playingPlaylist}
                onDragStart={() => {
                  if (open)
                    dragManager.handleDragStart(layerIndex, id, {
                      transformedHistory,
                      list: transformedHistory,
                    });
                }}
                tabIndex={0}
                onMouseDown={(e) => e.stopPropagation()}
                onDragOver={(e) => {
                  if (open) {
                    dragManager.handleDragOver(
                      layerIndex,
                      originalIndex,
                      id,
                      e,
                      {
                        transformedHistory,
                        list: transformedHistory,
                      }
                    );
                  }
                }}
                onDragEnd={() => {
                  if (open) {
                    dragManager.handleDragEnd({
                      transformedHistory,
                      list: transformedHistory,
                      setList,
                    });
                  }
                }}
                className={`history-item ${(oldItemsMap[layerData.id] || !!embedding) && "greyed-out"} ${(toggle === layerData.id || activeItemList?.[layerData.id] || activeItemID === layerData.id) && "current-playing-item"} ${dragOverSet.itemId === layerData.id && `dropabble-${dragOverSet.position}`}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!viewOnly) {
                    G.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                      G.ADDING_TOPLAYLIST_TIMEOUT = null;
                      if (layerData.type !== "heading")
                        onClickItem({ dataItem: layerData });
                    }, 1000);
                  }
                }}
                onPointerUp={() => {
                  if (G.ADDING_TOPLAYLIST_TIMEOUT) {
                    clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
                  }
                }}
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
                  {layerData.type !== "heading" &&
                  checklistEnabled &&
                  open &&
                  !viewOnly ? (
                    <Checkbox
                      small
                      disabled={!!embedding}
                      checked={
                        layers
                          ? !!checkListEmbeded?.[layerData.id]
                          : checkListData?.[layerData.id] ||
                            layerData.readAlready
                      }
                      onClick={() => {
                        const isShiftHold = G?.KEY_HOLD?.["shift"];
                        if (isShiftHold && id === G.LAST_CLICK_EMBED_PARENT) {
                          let upperLimit = Math.max(
                            layerIndex,
                            G.LAST_CLICK_EMBED_ID
                          );
                          let lowerLimit = Math.min(
                            layerIndex,
                            G.LAST_CLICK_EMBED_ID
                          );
                          const idsFilter = toBeMapArray
                            .filter(
                              (el: any, indexInner: number) =>
                                indexInner <= upperLimit &&
                                indexInner >= lowerLimit &&
                                indexInner !== G.LAST_CLICK_EMBED_ID &&
                                el.id !== embedding
                            )
                            .map((ele: any) => ele.id);
                          setChecklistEmbeded?.(idsFilter, id, false);
                          G.LAST_CLICK_EMBED_PARENT = id;
                          G.LAST_CLICK_EMBED_ID = layerIndex;
                          return;
                        } else {
                          G.LAST_CLICK_EMBED_PARENT = id;
                          G.LAST_CLICK_EMBED_ID = layerIndex;
                        }
                        if (layers) {
                          setChecklistEmbeded?.(layerData.id, id);
                        } else {
                          editDataFromPlaylist?.(layerData.id, false);
                        }
                      }}
                    />
                  ) : null}
                  {false && (
                    <span class="material-symbols-outlined unfollow drag-item-icon">
                      featured_play_list
                    </span>
                  )}
                </div>
                <p
                  onClick={() => {
                    if (G.ADDING_TOPLAYLIST_TIMEOUT)
                      clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
                    if (!viewOnly) {
                      if (layerData.type !== "heading") {
                        if (checklistEnabled) {
                          editDataFromPlaylist?.(layerData.id);
                        }
                        onClick({
                          dataItem: layerData,
                          index: layerIndex,
                          justPlay: !!layers && !playingPlaylist,
                        });
                      } else {
                        if (layerData.additionalInfo?.isQuotedText) {
                          showQuoteText({ quoteText: layerData.content });
                        }
                      }
                    }
                  }}
                  className={`playlist-item-type ${layerData.type !== "heading" && (embedding || checklistEnabled) && open && !viewOnly ? "" : "no-left-padding"} playlist-item-${layerData.type}`}
                >
                  {layerData.type === "headings" && (
                    <span class="material-symbols-outlined side-icon">
                      format_h1 //Not NEEEDED FOR NOW
                    </span>
                  )}
                  {layerData.type === "heading" ? (
                    <RenderHTMLContent htmlContent={layerData.content} />
                  ) : (
                    layerData.content
                  )}
                </p>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="actions"
                >
                  {((isTextType &&
                    !!dragManager.toggleIsQuoteText &&
                    !playingPlaylist) ||
                    (isTextType && isQuotedText && playingPlaylist)) && (
                    <p
                      className={`end-icon without-right-margin ${isQuotedText ? "active" : ""} ${`${
                        isMobile && "visible"
                      }`}`}
                      onClick={(e) => {
                        if (!playingPlaylist) {
                          e.stopPropagation();
                          dragManager.toggleIsQuoteText(
                            layerData.id,
                            id,
                            setList
                          );
                        }
                      }}
                    >
                      <span
                        style={{ fontSize: "1rem" }}
                        class="material-symbols-outlined"
                      >
                        home_max
                      </span>
                    </p>
                  )}
                  {layerData.type === "heading" && !playingPlaylist ? (
                    <p
                      className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        G.SetEditRichText?.({
                          id: layerData.id,
                          text: layerData.content,
                          parentID: id,
                          isQuotedText: isQuotedText,
                        });
                      }}
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </p>
                  ) : null}
                  {!playingPlaylist &&
                    layers &&
                    creatingPlaylist &&
                    open &&
                    !viewOnly && (
                      <p
                        className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                        onClick={() =>
                          onDisembed?.({ id: layerData.id, pId: id })
                        }
                      >
                        <span class="material-symbols-outlined unfollow delete-icon">
                          link_off
                        </span>
                      </p>
                    )}
                  {((creatingPlaylist && open && !viewOnly) ||
                    isDeleteShow) && (
                    <p
                      className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                      onClick={() => deleteFromList(layerIndex, id)}
                    >
                      <span class="material-symbols-outlined unfollow delete-icon">
                        delete
                      </span>
                    </p>
                  )}
                  {open && (
                    <LinkingItems
                      linkingMode={linkingMode}
                      playListId={playListSubId ?? undefined}
                      playlistName={playlistName ?? undefined}
                      data={layerData}
                    />
                  )}
                </div>
              </div>
            );
          })}
      </div>
      {itemSelected === data.id && !draggedItemID && !embedding && (
        <div style={{ padding: "1rem" }}>
          <AttachLink
            canClose
            onClose={() => setItemSelected(null)}
            attachLink={attachLink}
            massAdd={massAdd}
          />
        </div>
      )}
    </div>
  );
}
