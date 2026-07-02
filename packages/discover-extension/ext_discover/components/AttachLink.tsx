import { CLOSE, imageAssets, SEND } from "ext_discover.models.attachLink";
import { AttachLinkSubComponent } from "ext_discover.components.AttachLinkSubComponent";
import { getAttachLinkManager } from "ext_discover.managers.AttachLinkManager";
import { getAttachLinkSubComponentManager } from "ext_discover.managers.AttachLinkSubComponentManager";
import type { AttachLinkProps } from "ext_discover.interfaces.components.AttachLink";
import { LoaderSecondary } from "ext_discover.features.components.LoaderSecondary";

const G = globalThis as Record<string, any>;

const ATTACH_LINK_SCOPE = "attachLink";

export function AttachLink(props: AttachLinkProps) {
  const manager = props.manager ?? getAttachLinkManager(ATTACH_LINK_SCOPE);
  const subManager =
    props.subManager ?? getAttachLinkSubComponentManager(ATTACH_LINK_SCOPE);

  manager.syncProps(props);
  manager.mount(ATTACH_LINK_SCOPE);

  const loading = manager.loading.value;
  const data = manager.data.value;
  const editMode = manager.editMode.value;
  const filteredTags = manager.filteredTags.value;
  const selectedType = manager.selectedType.value;
  const isDisabled = manager.isDisabled.value;
  const canClose = manager.canClose.value;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"
      />
      <form
        className="add-new-playlist"
        ref={(el) => manager.setDragRef(el)}
        onSubmit={(e) => {
          e.preventDefault();
          manager.onClickSend();
        }}
      >
        <div
          className="container-render"
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        >
          {loading && (
            <div className="loader-container">
              <LoaderSecondary />
            </div>
          )}

          <AttachLinkSubComponent manager={manager} subManager={subManager} />
        </div>
        {Array.isArray(data) &&
          data.map((ele) => (
            <div
              style={{
                padding: "1rem",
                border: "1px solid gray",
                margin: "0.5rem",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyItems: "space-between",
              }}
            >
              <div className="align-center" style={{ gap: "1rem" }}>
                <img
                  src={G.getFileIconByMimeType(ele?.additionalInfo?.mimeType)}
                  style={{ width: "18px" }}
                />
                <div className="align-center">
                  <p class="truncate-text">{ele.content}</p>
                  <p>
                    .{G.getExtensionFromMimeType(ele?.additionalInfo?.mimeType)}
                  </p>
                </div>
              </div>
              <p
                style={{ marginLeft: "auto", cursor: "pointer" }}
                onClick={() => manager.deleteFromList(ele.id)}
              >
                <span class="material-symbols-outlined unfollow delete-icon">
                  delete
                </span>
              </p>
            </div>
          ))}
        {!editMode && (
          <div className="select_item_container">
            {filteredTags.map((ele: any) => (
              <div
                key={ele.id}
                onClick={() => manager.handleTypeSwitch(ele)}
                style={{ position: "relative" }}
                className={`${
                  ele === selectedType ? "active" : ""
                } select_item_type`}
              >
                {ele === "DATE" && (
                  <input
                    ref={(el) => manager.setDatePickerRef(el)}
                    type="date"
                    onChange={(e: any) => {
                      props.onDateClick?.(e?.target?.value || "");
                    }}
                    className="hidden-date"
                    placeholder="MM/DD/YYYY"
                  />
                )}
                <img
                  style={{ height: "16px", width: "16px" }}
                  src={
                    imageAssets[`${ele}${ele === selectedType ? "_2" : "_1"}`]
                  }
                />
              </div>
            ))}
            <div
              className="align-center"
              style={{ gap: "0.25rem", marginLeft: "auto" }}
            >
              {canClose && (
                <div
                  onClick={() => manager.handleClose()}
                  style={{ marginLeft: "auto" }}
                  className={`active  select_item_type`}
                >
                  <img src={CLOSE} style={{ width: "20px" }} />
                </div>
              )}
              <button
                type="submit"
                style={{
                  marginLeft: "auto",
                  cursor: isDisabled ? "not-allowed" : "",
                }}
                className={`${
                  !isDisabled ? "active" : "disabled"
                } select_item_type`}
                disabled={isDisabled}
              >
                <img src={SEND} style={{ width: "20px" }} />
              </button>
            </div>
          </div>
        )}
      </form>
    </>
  );
}
