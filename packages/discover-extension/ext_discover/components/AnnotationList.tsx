import { ANNOTATION_LIST_ICONS } from "ext_discover.models.annotationList";
import { AnnotationListFilters } from "ext_discover.components.AnnotationListFilters";
import { AnnotationHeading } from "ext_discover.components.AnnotationHeading";
import { ConfirmationModal } from "ext_discover.components.ConfirmationModal";
import { getAnnotationListManager } from "ext_discover.managers.AnnotationListManager";
import type { AnnotationListProps } from "ext_discover.interfaces.components.AnnotationList";
import { LoaderSecondary } from "ext_discover.features.components.LoaderSecondary";

export function AnnotationList({
  currentOpenedBook,
  chapter,
  fetchingAnnotation,
  setAnnotationData,
  annotationData,
  annotationSources,
  tagsSources,
  isPlayingPlaylist,
  scope = "default",
  manager = getAnnotationListManager(scope),
}: AnnotationListProps) {
  manager.syncExternal({ annotationData, setAnnotationData });

  const filters = manager.filters.value;
  const showFilters = manager.showFilters.value;
  const deleteModal = manager.deleteModal.value;
  const loading = manager.loading.value;
  const filteredAnnotationData = manager.filteredAnnotationData.value;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"
      />
      {filteredAnnotationData.length > 5 && (
        <div ref={manager.setFilterIconRef} />
      )}
      {deleteModal.address && (
        <ConfirmationModal
          loading={loading}
          title={t("deleteAnnotation")}
          colorSwitch={true}
          para={t("deleteAnnotationConfirmation")}
          onClose={() => {
            if (!loading) manager.closeModal();
          }}
          onConfirm={() =>
            manager.onDelete(
              deleteModal.address,
              deleteModal.index,
              currentOpenedBook,
              chapter
            )
          }
        />
      )}

      <h3 style={{ margin: "1rem 0 0 0 " }}>{t("annotations")}</h3>
      {fetchingAnnotation && (
        <div style={{ margin: "1rem 0", gap: "1rem" }} className="align-center">
          <LoaderSecondary />
          <p>{t("fetchingAnnotations")}</p>
        </div>
      )}

      {!fetchingAnnotation ? (
        <>
          {filteredAnnotationData.length === 0 && (
            <p style={{ marginTop: "12px" }}>{t("noAnnotationsFound")}</p>
          )}
          <div className="annotation" style={{ position: "relative" }}>
            <div
              className="filter-icon-container"
              style={{
                top: filteredAnnotationData.length > 0 ? "0.5rem" : "-2.1rem",
              }}
              onClick={() => manager.openFilters(filteredAnnotationData.length)}
            >
              <img
                className="img-icon"
                style={{ width: "16px", height: "16px" }}
                src={ANNOTATION_LIST_ICONS.filter}
                alt="filter"
              />
            </div>
            {showFilters && (
              <AnnotationListFilters
                showAtBottom={filteredAnnotationData.length < 6}
                onChangeFilters={manager.onChangeFilters}
                onClearFilters={manager.onClearFilters}
                currentOpenedBook={currentOpenedBook}
                filters={filters}
                handleClose={() => manager.setShowFilters(false)}
                annotationSources={annotationSources}
                tagsSources={tagsSources}
                scope={scope}
              />
            )}
            {filteredAnnotationData.map((ele: any, index: number) => (
              <AnnotationHeading
                key={ele.address}
                address={ele.address}
                index={index}
                onDelete={(address, idx) =>
                  manager.onDelete(address, idx, currentOpenedBook, chapter)
                }
                heading={ele.heading}
                tags={ele.tags}
                isPlayingPlaylist={isPlayingPlaylist}
                data={ele.data}
                currentOpenedBook={currentOpenedBook}
                chapter={chapter}
                deleteOverlay={manager.deleteOverlay.value}
                setDeleteOverlay={(value) => {
                  manager.deleteOverlay.value = value;
                }}
                position={{ current: manager.position.value }}
                setDeleteModal={manager.setDeleteModal}
                setShowFilters={manager.setShowFilters}
                closeOverlay={manager.closeOverlay}
                scope={scope}
              />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
