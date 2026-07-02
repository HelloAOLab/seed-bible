import { annotationListFiltersCss } from "ext_discover.css.annotationListFiltersCss";
import { ANNOTATION_LIST_FILTER_ICONS } from "ext_discover.models.annotationList";
import {
  getAnnotationListDateOptions,
  getVersesOptionsFromBook,
} from "ext_discover.hooks.filterAnnotationData";
import { getAnnotationListFiltersManager } from "ext_discover.managers.AnnotationListFiltersManager";
import { getSearchAndAddManager } from "ext_discover.managers.SearchAndAddManager";
import { Select } from "ext_discover.features.components.Select";
import { Input } from "ext_discover.features.components.Input";
import { Checkbox } from "ext_discover.features.components.Checkbox";
import { Button } from "ext_discover.features.components.Button";
import type {
  AnnotationListFiltersProps,
  SearchAndAddProps,
} from "ext_discover.interfaces.components.AnnotationListFilters";

const G = globalThis as Record<string, any>;

function AnnotationFilterHeadings({
  title,
  icon,
  onClearFilters,
  keyFilter,
}: {
  title: string;
  icon?: string;
  onClearFilters: (key?: string) => void;
  keyFilter: string;
}) {
  return (
    <div className="annotation-filter-heading">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {icon && <img src={icon} alt={title} />}
        <p className="annotation-filter-heading-title">{title}</p>
      </div>
      <p
        onClick={() => onClearFilters(keyFilter)}
        className="annotation-filter-heading-clear"
      >
        Clear
      </p>
    </div>
  );
}

export function SearchAndAdd({
  onChangeFilters,
  sources,
  selectedSources,
  placeholder = t("typeToSearch"),
  keySources = "sources",
  scope = "default",
  manager = getSearchAndAddManager(`${scope}-${keySources}`),
}: SearchAndAddProps) {
  const sourcesSearch = manager.sourcesSearch.value;
  const showSelectBox = manager.showSelectBox.value;
  const sourcesMap = manager.getSourcesMap(sources);
  const filteredSources = manager.getFilteredSources(sources);

  return (
    <div ref={manager.setContainerRef} style={{ position: "relative" }}>
      <Input
        value={sourcesSearch}
        onChangeListener={manager.setSourcesSearch}
        placeholder={placeholder}
        onFocus={() => {
          manager.setShowSelectBox(true);
        }}
        style={{
          marginBottom: "0",
        }}
      />
      <div className="selected-sources-container">
        {Object.keys(selectedSources).map((source) => (
          <div key={source} className="profile-chip">
            {!!sourcesMap[source]?.profilePicture && (
              <img
                className="profile-chip-img"
                src={sourcesMap[source].profilePicture}
                alt={sourcesMap[source].name}
              />
            )}
            <p>{sourcesMap[source]?.name}</p>
            <span
              onClick={() => {
                onChangeFilters(keySources, source);
              }}
              className="material-symbols-outlined"
              style={{ cursor: "pointer" }}
            >
              close
            </span>
          </div>
        ))}
      </div>
      {showSelectBox && (
        <div className="select-box-sources">
          {filteredSources.map((source: any) => (
            <div key={source.value} className="profile-select">
              <Checkbox
                checked={selectedSources[source.value]}
                onClick={() => {
                  onChangeFilters(keySources, source.value);
                }}
                style={{
                  height: "18px",
                  marginRight: "0.5rem",
                }}
                small
              />
              {!!source.profilePicture && (
                <img
                  style={{ marginLeft: "1rem" }}
                  className="profile-chip-img"
                  src={source.profilePicture}
                  alt={source.label}
                />
              )}
              <p>{source.label}</p>
            </div>
          ))}
          {filteredSources.length === 0 && (
            <p style={{ padding: "1rem" }}>No {keySources} found.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AnnotationListFilters({
  onChangeFilters,
  onClearFilters,
  filters,
  annotationSources,
  tagsSources,
  currentOpenedBook,
  showAtBottom,
  handleClose,
  scope = "default",
  filtersManager = getAnnotationListFiltersManager(scope),
}: AnnotationListFiltersProps) {
  filtersManager.syncDateOption(filters.dateOption);
  const dateOptions = getAnnotationListDateOptions(t);
  const versesOptions = getVersesOptionsFromBook(currentOpenedBook);

  return (
    <>
      <style>{annotationListFiltersCss}</style>
      <div className="backdrop" onClick={() => handleClose()} />
      <div
        className="filter-container"
        style={{
          top: showAtBottom ? "auto" : "3.5rem",
          bottom: showAtBottom ? "2rem" : "auto",
        }}
      >
        <h3 className="filter-title">Filter By</h3>
        <div>
          <AnnotationFilterHeadings
            title={t("date")}
            icon={ANNOTATION_LIST_FILTER_ICONS.date}
            onClearFilters={onClearFilters}
            keyFilter="dateOption"
          />
          <Select
            sxSelect={{ width: "100%", marginBottom: "0" }}
            secondary
            value={filters.dateOption}
            onChangeListener={(val: string) => {
              onChangeFilters("dateOption", val);
            }}
            name={`${t("selectDateRange")}:`}
            options={dateOptions}
          />
          {filters.dateOption === "custom" && (
            <div className="date-container">
              <div className="date">
                <input
                  ref={filtersManager.setFromInputRef}
                  type="date"
                  className="hidden-date"
                  placeholder="MM/DD/YYYY"
                  onChange={(e: any) => {
                    onChangeFilters("fromDate", e?.target?.value || "");
                  }}
                />
                <AnnotationFilterHeadings
                  title={t("from")}
                  onClearFilters={onClearFilters}
                  keyFilter="fromDate"
                />
                <p className="place-holder-date">
                  {filters.fromDate
                    ? G.FORMAT_DATE(
                        filters.fromDate.replaceAll("/", "-"),
                        "MM/DD/YYYY",
                        "MM-DD-YYYY"
                      )
                    : "MM/DD/YYYY"}
                </p>
              </div>
              <div className="date">
                <input
                  ref={filtersManager.setToInputRef}
                  type="date"
                  onChange={(e: any) => {
                    onChangeFilters("toDate", e?.target?.value || "");
                  }}
                  className="hidden-date"
                  placeholder="MM/DD/YYYY"
                />
                <AnnotationFilterHeadings
                  title={t("to")}
                  onClearFilters={onClearFilters}
                  keyFilter="toDate"
                />
                <p className="place-holder-date">
                  {filters.toDate
                    ? G.FORMAT_DATE(
                        filters.toDate.replaceAll("/", "-"),
                        "MM/DD/YYYY",
                        "MM-DD-YYYY"
                      )
                    : "MM/DD/YYYY"}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="line-filter-container"></div>
        <AnnotationFilterHeadings
          title={t("sources")}
          icon={ANNOTATION_LIST_FILTER_ICONS.sources}
          onClearFilters={onClearFilters}
          keyFilter="sources"
        />
        <SearchAndAdd
          onChangeFilters={onChangeFilters}
          onClearFilters={onClearFilters}
          filters={filters}
          sources={annotationSources}
          selectedSources={filters.sources}
          keySources="sources"
          placeholder={t("search_sources")}
          scope={scope}
        />
        <div className="line-filter-container"></div>
        <AnnotationFilterHeadings
          title={t("verses")}
          icon={ANNOTATION_LIST_FILTER_ICONS.verses}
          onClearFilters={onClearFilters}
          keyFilter="verse"
        />
        <SearchAndAdd
          onChangeFilters={onChangeFilters}
          onClearFilters={onClearFilters}
          sources={versesOptions}
          selectedSources={filters.verse}
          keySources="verse"
          placeholder={t("search_verses")}
          scope={scope}
        />
        <div className="line-filter-container"></div>
        <AnnotationFilterHeadings
          title={t("tags")}
          icon={ANNOTATION_LIST_FILTER_ICONS.tags}
          onClearFilters={onClearFilters}
          keyFilter="tags"
        />
        <SearchAndAdd
          onChangeFilters={onChangeFilters}
          onClearFilters={onClearFilters}
          sources={tagsSources}
          selectedSources={filters.tags}
          keySources="tags"
          placeholder={t("search_tags")}
          scope={scope}
        />
        <div className="line-filter-container"></div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "0.5rem",
          }}
        >
          <Button secondaryAlt onClick={() => onClearFilters()}>
            {t("reset_filters")}
          </Button>
        </div>
      </div>
    </>
  );
}
