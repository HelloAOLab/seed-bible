import { AttachmentLinkItem } from "ext_discover.components.AttachmentLinkItem";
import { RenderHTMLContent } from "ext_discover.components.RenderHTMLContent";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import {
  getAnnotationInnerDivManager,
  syncAnnotationInnerDivSelection,
} from "ext_discover.managers.AnnotationInnerDivManager";
import type { AnnotationInnerDivProps } from "ext_discover.interfaces.components.AnnotationInnerDiv";
import { Chips } from "ext_discover.features.components.Chips";
import { Checkbox } from "ext_discover.features.components.Checkbox";

const G = globalThis as Record<string, any>;
const isMobile = isMobilePlaylistViewport();

export function AnnotationInnerDiv(props: AnnotationInnerDivProps) {
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

  const manager = props.manager ?? getAnnotationInnerDivManager(data.id);
  syncAnnotationInnerDivSelection(manager, data.id, selectedAnnotation);
  const expand = manager.expand.value;

  return (
    <>
      <div
        key={`${data.id}-${data.readAlready}`}
        onDragStart={() => handleDragStart(index, pId)}
        onDragOver={(e) => handleDragOver(index, originalIndex ?? null, pId, e)}
        onDragEnd={handleDragEnd}
        tabIndex={0}
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
          }, 1000);
        }}
        onPointerUp={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT) {
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
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
                  const upperLimit = Math.max(index, G.LAST_CLICK_ID);
                  const lowerLimit = Math.min(index, G.LAST_CLICK_ID);
                  const idsFilter = finalHistoryObject
                    .filter(
                      (ele: { id: string }, indexInner: number) =>
                        indexInner <= upperLimit &&
                        indexInner >= lowerLimit &&
                        indexInner !== G.LAST_CLICK_ID &&
                        ele.id !== embedding
                    )
                    .map((ele: { id: string }) => ele.id);
                  editDataFromPlaylist(idsFilter);
                  G.LAST_CLICK_ID = index;
                  return;
                }
                G.LAST_CLICK_ID = index;

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
                editDataFromPlaylist(data.id);
              }}
            />
          ) : null}
        </div>
        <p
          onPointerUp={() => {}}
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
                        editDataFromPlaylist(data.id);
                      }
                    } else {
                      editDataFromPlaylist(data.id);
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
                  manager.expand.value = !manager.expand.value;
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
              deleteFromList(data.id, pId ?? undefined);
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
            {data.additionalInfo.tags.map((ele: string, tagIndex: number) => (
              <Chips
                label={ele}
                key={tagIndex}
                onDelete={() => {
                  onRemoveTag(tagIndex, data.id);
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
                checklistEnabled={!!checklistEnabled}
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
                    const upperLimit = Math.max(
                      indexInner,
                      G.LAST_CLICK_EMBED_ID
                    );
                    const lowerLimit = Math.min(
                      indexInner,
                      G.LAST_CLICK_EMBED_ID
                    );
                    const idsFilter = data.additionalInfo.layers
                      .filter(
                        (layer: { id: string }, layerIndex: number) =>
                          layerIndex <= upperLimit &&
                          layerIndex >= lowerLimit &&
                          layerIndex !== G.LAST_CLICK_EMBED_ID &&
                          layer.id !== embedding
                      )
                      .map((layer: { id: string }) => layer.id);
                    setChecklistEmbeded(idsFilter, data.id);
                    G.LAST_CLICK_EMBED_PARENT = data.id;
                    G.LAST_CLICK_EMBED_ID = indexInner;
                    return;
                  }
                  G.LAST_CLICK_EMBED_PARENT = data.id;
                  G.LAST_CLICK_EMBED_ID = indexInner;
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
                singleMode={singleMode}
                setEmbedding={setEmbedding}
                setChecklistEmbeded={setChecklistEmbeded}
                finalHistoryObject={finalHistoryObject}
                isSomethingEmbededChecked={isSomethingEmbededChecked}
                selectedAnnotation={selectedAnnotation}
                onClickCheckbox={() => {
                  const isShiftHold = G?.KEY_HOLD?.["shift"];
                  if (isShiftHold && data.id === G.LAST_CLICK_EMBED_PARENT) {
                    const upperLimit = Math.max(
                      indexInner,
                      G.LAST_CLICK_EMBED_ID
                    );
                    const lowerLimit = Math.min(
                      indexInner,
                      G.LAST_CLICK_EMBED_ID
                    );
                    const idsFilter = data.additionalInfo.layers
                      .filter(
                        (layer: { id: string }, layerIndex: number) =>
                          layerIndex <= upperLimit &&
                          layerIndex >= lowerLimit &&
                          layerIndex !== G.LAST_CLICK_EMBED_ID &&
                          layer.id !== embedding
                      )
                      .map((layer: { id: string }) => layer.id);
                    setChecklistEmbeded(idsFilter, data.id);
                    G.LAST_CLICK_EMBED_PARENT = data.id;
                    G.LAST_CLICK_EMBED_ID = indexInner;
                    return;
                  }
                  G.LAST_CLICK_EMBED_PARENT = data.id;
                  G.LAST_CLICK_EMBED_ID = indexInner;
                  setChecklistEmbeded(ele.id, data.id);
                }}
              />
            )
          )}
        </div>
      )}
    </>
  );
}
