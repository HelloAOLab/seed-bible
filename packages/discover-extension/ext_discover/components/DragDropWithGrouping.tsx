import { PlaylistRowItem } from "ext_discover.components.PlaylistRowItem";
import { AttachmentLinkItem } from "ext_discover.components.AttachmentLinkItem";
import { AttachLink } from "ext_discover.components.AttachLink";
import { LinkingItems } from "ext_discover.components.LinkingItems";
import { RenderHTMLContent } from "ext_discover.components.RenderHTMLContent";
import { DragDropLayerGroup } from "ext_discover.components.DragDropLayerGroup";
import { groupVerse } from "ext_discover.helper.groupVerse";
import { showQuoteText } from "ext_discover.helper.showQuoteText";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import { computePlaylistDateIssues } from "ext_discover.hooks.computePlaylistDateIssues";
import { getDragDropWithGroupingManager } from "ext_discover.managers.DragDropWithGroupingManager";
import type { DragDropWithGroupingProps } from "ext_discover.interfaces.components.DragDropWithGrouping";
import { Checkbox } from "ext_discover.features.components.Checkbox";

const G = globalThis as Record<string, any>;
const isMobile = isMobilePlaylistViewport();

const toggle = "null";

export function DragDropWithGrouping({
  manager,
  scope,
  massAdd,
  attachLink,
  onGenClick = () => {},
  setItemSelected = () => {},
  itemSelected,
  access,
  isSomethingEmbededChecked,
  checkListEmbeded,
  setChecklistEmbeded,
  onDisembed = () => {},
  layers = true,
  embedding,
  setEmbedding = () => {},
  setRef = {},
  allowHeadingCheck,
  selectedTags,
  playlistName,
  currentDateActive,
  clickPass,
  currentFormat,
  readingPlanEnabled,
  linkingMode,
  viewOnly,
  checkListData = {},
  oldItemsMap = {},
  parentId,
  list,
  isPlayer,
  playingPlaylist,
  activeItemList = {},
  activeItemID,
  setList,
  editDataFromPlaylist,
  playListSubId,
  setPlaylistFromRow = () => {},
  playListSubIndex = null,
  deleteFromList = () => {},
  onClickItem = () => {},
  onClick,
  creatingPlaylist = false,
  color,
  icon,
  isCustomColor,
  description,
  isCustomIcon,
  isDeleteShow,
}: DragDropWithGroupingProps) {
  const managerScope =
    scope ?? `${parentId ?? "root"}-${playListSubId ?? "main"}`;
  const dragManager = manager ?? getDragDropWithGroupingManager(managerScope);

  const checklistEnabled = isPlayer || embedding;

  const transformedHistory = groupVerse(list);
  const { datesRepeat, datesInWrongOrder } =
    computePlaylistDateIssues(transformedHistory);

  const dragCtx = { transformedHistory, list };
  const dragEndCtx = { transformedHistory, list, setList };

  return (
    <>
      {creatingPlaylist && Object.keys(datesRepeat).length > 0 && (
        <div className="mini-alert mini-alert-error">
          <span className="icon">🚨</span>
          <p>{t("pleaseFixRepeatingDates")}</p>
        </div>
      )}
      {creatingPlaylist && Object.keys(datesInWrongOrder).length > 0 && (
        <div className="mini-alert mini-alert-warning">
          <span className="icon">⚠️</span>
          <p>{t("pleaseFixDatesInWrongOrder")}</p>
        </div>
      )}

      {list.length === 0 && (
        <div className="no-items-box">
          <h4 style={{ margin: "8px 0" }}>{t("addItemsBelow")}</h4>
          {G.DEV_ENV && (
            <>
              <p className="or" />
              <p onClick={onGenClick}>{t("clickHereToGeneratePlaylist")}</p>
            </>
          )}
        </div>
      )}
      {transformedHistory.map((data: any, index: number) => {
        const isTextType = data.type === "heading" || data.type === "text";
        const isQuotedText = data.additionalInfo.isQuotedText;
        return data.type?.includes("range") ||
          (data.additionalInfo?.layers?.length > 0 && layers) ? (
          <DragDropLayerGroup
            linkingMode={linkingMode}
            isAdditionalInfo={
              data.type?.includes("range") &&
              !data.additionalInfo?.layers?.length
            }
            embedding={embedding}
            itemSelected={itemSelected}
            setItemSelected={setItemSelected}
            isDeleteShow={isDeleteShow}
            attachLink={attachLink}
            massAdd={massAdd}
            draggedItemID={dragManager.draggedItemID.value}
            setRef={setRef}
            datesRepeat={datesRepeat}
            clickPass={clickPass}
            datesInWrongOrder={datesInWrongOrder}
            currentFormat={currentFormat}
            currentDateActive={currentDateActive}
            setList={setList}
            transformedHistory={transformedHistory}
            playListSubIndex={playListSubIndex}
            setEmbedding={setEmbedding}
            data={data}
            checkListEmbeded={checkListEmbeded}
            setChecklistEmbeded={setChecklistEmbeded}
            playListSubId={playListSubId}
            isSomethingEmbededChecked={isSomethingEmbededChecked}
            onDisembed={onDisembed}
            layers={layers}
            playlistName={playlistName}
            activeItemList={activeItemList}
            activeItemID={activeItemID}
            viewOnly={viewOnly}
            playingPlaylist={playingPlaylist}
            greyOut={data.greyOut}
            onClick={onClick}
            key={`${data.id}-${data.readAlready}`}
            originalIndex={index}
            checklistEnabled={checklistEnabled}
            checkListData={checkListData}
            dragOverSet={dragManager.dragOverSet.value}
            editDataFromPlaylist={editDataFromPlaylist}
            creatingPlaylist={creatingPlaylist}
            deleteFromList={deleteFromList}
            index={index}
            readingPlanEnabled={readingPlanEnabled}
            dragManager={dragManager}
            toggle={toggle || activeItemID}
            oldItemsMap={oldItemsMap}
            type={data.type}
            content={data.content}
            id={data.id}
            additionalInfo={data.additionalInfo}
            onClickItem={onClickItem}
          />
        ) : data.type === "playlist" ? (
          <PlaylistRowItem
            access={access}
            viewOnly={viewOnly}
            toggle={toggle || activeItemID}
            playingPlaylist={playingPlaylist}
            activeItemList={activeItemList}
            layers={layers}
            currentDateActive={currentDateActive}
            activeItemID={activeItemID}
            setRef={setRef}
            isDeleteShow={isDeleteShow}
            currentFormat={currentFormat}
            oldItemsMap={oldItemsMap}
            checklistEnabled={checklistEnabled}
            color={color}
            isSomethingEmbededChecked={isSomethingEmbededChecked}
            icon={icon}
            description={description}
            isCustomColor={isCustomColor}
            isCustomIcon={isCustomIcon}
            checkListData={checkListData}
            clickPass={clickPass}
            handleDragEnd={() => dragManager.handleDragEnd(dragEndCtx)}
            setOpenedList={dragManager.setOpenedList}
            readingPlanEnabled={readingPlanEnabled}
            parentId={parentId!}
            attachment={data.attachment}
            opendedList={dragManager.opendedList.value}
            handleDragStart={(idx) =>
              dragManager.handleDragStart(idx, undefined, dragCtx)
            }
            selectedTags={selectedTags}
            dragOverSet={dragManager.dragOverSet.value}
            handleDragOver={(idx) =>
              dragManager.handleDragOver(idx, null, null, undefined, dragCtx)
            }
            playListIndex={index}
            index={index}
            list={data.list}
            key={data.id}
            id={data.id}
            playListSubId={playListSubId}
            creatingPlaylist={creatingPlaylist}
            playListSubIndex={playListSubIndex}
            onClick={onClick}
            name={data.name}
            playlistParentName={playlistName}
            setPlaylists={setPlaylistFromRow}
          />
        ) : data.type === "attachment-link" || data.type === "date" ? (
          <AttachmentLinkItem
            linkingMode={linkingMode}
            viewOnly={viewOnly}
            isSomethingEmbededChecked={isSomethingEmbededChecked}
            datesRepeat={datesRepeat}
            datesInWrongOrder={datesInWrongOrder}
            embedding={embedding}
            isDeleteShow={isDeleteShow}
            playlistName={playlistName}
            currentFormat={currentFormat}
            readingPlanEnabled={readingPlanEnabled}
            autoPlayToggle={(idx, pId, layerId) =>
              dragManager.autoPlayToggle(idx, pId, layerId, setList)
            }
            toggleIsQuoteText={(layerId, pId) =>
              dragManager.toggleIsQuoteText(layerId, pId, setList)
            }
            layers={layers}
            dragOverSet={dragManager.dragOverSet.value}
            oldItemsMap={oldItemsMap}
            currentDateActive={currentDateActive}
            originalIndex={null}
            activeItemID={activeItemID}
            clickPass={clickPass}
            setRef={setRef}
            activeItemList={activeItemList}
            onClick={onClick}
            playlistId={playListSubId}
            onClickItem={onClickItem}
            checklistEnabled={checklistEnabled}
            checkListData={checkListData}
            creatingPlaylist={creatingPlaylist}
            index={index}
            editDataFromPlaylist={editDataFromPlaylist}
            handleDragStart={(idx, pId) =>
              dragManager.handleDragStart(idx, pId, dragCtx)
            }
            handleDragOver={(idx, origIdx, nullArg, e) =>
              dragManager.handleDragOver(idx, origIdx, nullArg, e, dragCtx)
            }
            toggle={toggle}
            setList={setList}
            handleDragEnd={() => dragManager.handleDragEnd(dragEndCtx)}
            originalList={transformedHistory}
            playListSubIndex={playListSubIndex}
            deleteFromList={deleteFromList}
            key={`${data.id}-${data.readAlready}`}
            playingPlaylist={playingPlaylist}
            data={data}
          />
        ) : (
          <>
            <div
              key={`${data.id}-${data.readAlready}`}
              draggable={!playingPlaylist && !viewOnly}
              onMouseDown={(e) => e.stopPropagation()}
              onDragStart={() =>
                dragManager.handleDragStart(index, undefined, dragCtx)
              }
              onDragOver={(e) =>
                dragManager.handleDragOver(index, null, null, e, dragCtx)
              }
              onDragEnd={() => dragManager.handleDragEnd(dragEndCtx)}
              tabIndex={0}
              style={{ display: "flex" }}
              className={`history-item ${embedding === data.id ? "embedding-on" : ""} ${(data.greyOut || oldItemsMap[data.id]) && "greyed-out"} ${(toggle === data.id || activeItemList[data.id] || data.id === activeItemID) && "current-playing-item"} ${dragManager.dragOverSet.value.itemId === data.id && `dropabble-${dragManager.dragOverSet.value.position}`}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!viewOnly) {
                  if (data.type === "heading" && !embedding) {
                  } else {
                    const isMultiFunctionHold = CheckMultiFuntionHold();

                    if (!isMultiFunctionHold && !checklistEnabled)
                      setItemSelected((prev: any) =>
                        prev === data.id ? null : data.id
                      );
                  }
                }
                if (!viewOnly) {
                  G.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                    G.ADDING_TOPLAYLIST_TIMEOUT = null;
                    if (data.type !== "heading")
                      onClickItem({ dataItem: data });
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
                  if (setRef && setRef[data.id]) {
                    setRef[data.id].current = ref;
                  }
                }}
              />

              <div className="start-actions">
                {(data.type !== "heading" || allowHeadingCheck) &&
                checklistEnabled &&
                !viewOnly ? (
                  <Checkbox
                    small
                    disabled={embedding === data.id}
                    checked={
                      checkListData[data.id] ||
                      data.readAlready ||
                      embedding === data.id
                    }
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
                          setEmbedding(data.id);
                          return;
                        }
                      }
                      editDataFromPlaylist?.(data.id, false);
                    }}
                  />
                ) : null}

                {false && (
                  <span class="material-symbols-outlined unfollow drag-item-icon">
                    video_library
                  </span>
                )}
              </div>
              <p
                onClick={() => {
                  if (G.ADDING_TOPLAYLIST_TIMEOUT)
                    clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);

                  if (
                    !viewOnly &&
                    (data.type !== "heading" || allowHeadingCheck)
                  ) {
                    onClick?.({ dataItem: data, index });
                    if (checklistEnabled && !checkListData[data.id]) {
                      editDataFromPlaylist?.(data.id);
                    }
                  } else if (
                    data.type === "heading" &&
                    data.additionalInfo?.isQuotedText
                  ) {
                    showQuoteText({ quoteText: data.content });
                  }
                }}
                style={{
                  border:
                    data.id === itemSelected
                      ? "1px solid var(--secondaryColor)"
                      : "",
                  backgroundColor:
                    data.id === itemSelected ? "var(--activeTabFill)" : "",
                }}
                className={`playlist-item-type ${(data.type !== "heading" || allowHeadingCheck) && checklistEnabled && !viewOnly ? "" : "no-left-padding"} playlist-item-${data.type}`}
              >
                {data.type === "headings" && (
                  <span class="material-symbols-outlined side-icon">
                    format_h1 //Not NEEEDED FOR NOW
                  </span>
                )}
                {data.type === "heading" ? (
                  <RenderHTMLContent htmlContent={data.content} />
                ) : (
                  data.content
                )}
              </p>
              <div
                className="actions"
                onClick={(e) => {
                  e.stopPropagation();
                }}
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
                          data.id,
                          undefined,
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
                {data.type === "heading" && !playingPlaylist ? (
                  <p
                    className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      G.SetEditRichText?.({
                        id: data.id,
                        text: data.content,
                        isQuotedText: data.additionalInfo?.isQuotedText,
                      });
                    }}
                  >
                    <span class="material-symbols-outlined">edit</span>
                  </p>
                ) : null}
                {!playingPlaylist &&
                  data.type !== "heading" &&
                  !embedding &&
                  layers &&
                  creatingPlaylist &&
                  !viewOnly && (
                    <p
                      className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (data.type === "heading") {
                          ShowNotification({
                            message: `Headings & Media cannot be embeded!`,
                            severity: "error",
                          });
                        } else {
                          setEmbedding(data.id);
                          if (checkListData[data.id]) {
                            editDataFromPlaylist?.(data.id, false);
                          }
                        }
                      }}
                    >
                      <span class="material-symbols-outlined">pip</span>
                    </p>
                  )}
                {((!playingPlaylist && creatingPlaylist && !viewOnly) ||
                  isDeleteShow) && (
                  <p
                    className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFromList(index);
                    }}
                  >
                    <span class="material-symbols-outlined unfollow delete-icon">
                      delete
                    </span>
                  </p>
                )}
                <LinkingItems
                  linkingMode={linkingMode}
                  data={data}
                  playlistName={playlistName ?? undefined}
                  playListId={playListSubId ?? undefined}
                />
              </div>
            </div>
            {itemSelected === data.id &&
              !dragManager.draggedItemID.value &&
              !embedding && (
                <div style={{ padding: "1rem" }}>
                  <AttachLink
                    canClose
                    onClose={() => setItemSelected(null)}
                    attachLink={attachLink}
                    massAdd={massAdd}
                  />
                </div>
              )}
          </>
        );
      })}
    </>
  );
}
