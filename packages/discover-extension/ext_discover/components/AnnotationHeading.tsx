import { ANNOTATION_LIST_ICONS } from "ext_discover.models.annotationList";
import { AnnotationDataMapper } from "ext_discover.components.AnnotationDataMapper";
import { getAnnotationHeadingManager } from "ext_discover.managers.AnnotationHeadingManager";
import type { AnnotationHeadingProps } from "ext_discover.interfaces.components.AnnotationHeading";

export function AnnotationHeading({
  address,
  heading,
  tags,
  data,
  currentOpenedBook,
  chapter,
  setDeleteModal,
  closeOverlay,
  index,
  isPlayingPlaylist,
  scope = "default",
  manager = getAnnotationHeadingManager(`${scope}-${address}`),
}: AnnotationHeadingProps) {
  const isOpen = manager.isOpen.value;

  return (
    <div
      className="annotation-item-container"
      style={{
        height: isOpen ? "max-content" : "2rem",
        overflow: "hidden",
        transition: "all 0.3s ease-in-out",
      }}
    >
      <div
        className="align-center"
        style={{
          margin: "0.5rem 0",
          gap: "1rem",
          display: "flex",
          width: "100%",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <p
            className="verse-annotation"
            style={{ textTransform: "uppercase" }}
          >
            {heading}
          </p>
          <img
            onClick={manager.toggleOpen}
            style={{
              cursor: "pointer",
              transition: "transform 0.3s ease-in-out",
              marginLeft: "auto",
              transform: !isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
            alt=">"
            src={ANNOTATION_LIST_ICONS.chevronDown2}
          />
        </div>
      </div>
      <div className="align-center">
        {tags?.length > 0 ? (
          <div
            style={{ margin: "0.5rem 0", flexGrow: "1" }}
            className="align-center"
          >
            <img
              src={ANNOTATION_LIST_ICONS.tags}
              alt="Tags"
              className="img-icon"
            />
            {tags.map((tag: string, tagIndex: number) => (
              <div
                key={tagIndex}
                style={{ marginLeft: "0.5rem" }}
                className="align-center"
              >
                <p>{tag}</p>
                <img
                  style={{ margin: "0 0.5rem" }}
                  src={ANNOTATION_LIST_ICONS.dot}
                  alt="dot"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <AnnotationDataMapper
        onDelete={() => {
          setDeleteModal({ address, index });
          closeOverlay();
        }}
        isPlayingPlaylist={isPlayingPlaylist}
        data={data}
        address={address}
        currentOpenedBook={currentOpenedBook}
        chapter={chapter}
        heading={heading}
        scope={scope}
      />
    </div>
  );
}
