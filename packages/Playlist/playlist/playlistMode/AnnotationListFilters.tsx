const { useRef, useEffect, useState, useMemo } = os.appHooks;
const { Select, Input, Checkbox, Button } = Components;

const SourcesIcon = 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/e0e41197b32166d247f31fc36f1ad6c90f02723edda1c33c57c22a63514e6fc3.svg';
const TagsIcon = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/d6c4e22382dff7567a7f1490ecea9fe6a924d103ba43ff06a297908ab9716ad2.svg";
const DateIcon = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/9e274544bbbbde7666d86fb96abb0fdd6b8c46aa2ed6589a11a521fc329dd81d.svg";
const VersesIcon = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/6ba4514da1d4169a54082a5554aea48f96d6b9736cd939adf49563f8e6807d00.svg";

const DATE_OPTIONS = [
    { label: t('anytime'), value: "any" },
    { label: t('yesterday'), value: "yesterday" },
    { label: t('last_week'), value: "last_week" },
    { label: t('last_month'), value: "last_month" },
    { label: t('last_year'), value: "last_year" },
    { label: t('custom_date_range'), value: "custom" }
  ];

const AnnotationListFilters = ({
    onChangeFilters,
    onClearFilters,
    filters,
    annotationSources,
    currentOpenedBook,
    handleClose
}) => {
  const refInput = useRef(null);
  const refInputto = useRef(null);
  
  useEffect(() => {
    if(refInput.current) {
      window.flatpickr(refInput.current, {
        dateFormat: "m/d/Y",
        allowInput: false
      });
    }
    if(refInputto.current) {
      window.flatpickr(refInputto.current, {
        dateFormat: "m/d/Y",
        allowInput: false
      });
    }
  }, [filters.dateOption]);


  const versesOptions = useMemo(() => {
    const versesSources:any = [];
    currentOpenedBook.content.map((cnt:any)=>cnt.verses).flat().forEach(ele=>{
        if(ele.verseNumber) {
            versesSources.push({
                label: `${currentOpenedBook.book} ${currentOpenedBook.chapter}:${ele.verseNumber}`,
                value: ele.verseNumber,
            });
        }
    });
    return versesSources;
  }, [currentOpenedBook]);

  return (
    <>
        <style>{`${thisBot.tags['AnnotationListFilters.css']}`}</style>
        <div className="backdrop" onClick={() => handleClose()} />
        <div className="filter-container">
            <h3 className="filter-title">Filter By</h3>
            <div>
                <AnnotationFilterHeadings title={t('date')} icon={DateIcon} onClearFilters={onClearFilters} keyFilter="dateOption" />
                <Select
                    sxSelect={{ width: "100%", marginBottom: "0" }}
                    secondary
                    value={filters.dateOption}
                    onChangeListener={(val) => {
                        onChangeFilters("dateOption", val);
                    }}
                    name={`${t('selectDateRange')}:`}
                    options={DATE_OPTIONS}
                />
                {filters.dateOption === "custom" && <div className="date-container">
                    <div className="date">
                        <input
                            ref={refInput}
                            type="date"
                            className="hidden-date"
                            placeholder="MM/DD/YYYY"
                            onChange={(e)=>{
                                onChangeFilters("fromDate", e.target.value);
                            }}
                        />
                        <AnnotationFilterHeadings title={t('from')} onClearFilters={onClearFilters} keyFilter="fromDate" />
                        <p className="place-holder-date">{filters.fromDate ? FORMAT_DATE(filters.fromDate.replaceAll("/","-"), "MM/DD/YYYY", "MM-DD-YYYY") : "MM/DD/YYYY"}</p>
                    </div>
                    <div className="date">
                        <input
                            ref={refInputto}
                            type="date"
                            onChange={(e)=>{
                                onChangeFilters("toDate", e.target.value);
                            }}
                            className="hidden-date"
                            placeholder="MM/DD/YYYY"
                        />
                        <AnnotationFilterHeadings title={t('to')} onClearFilters={onClearFilters} keyFilter="toDate" />
                        <p className="place-holder-date">{filters.toDate ? FORMAT_DATE(filters.toDate.replaceAll("/","-"), "MM/DD/YYYY", "MM-DD-YYYY") : "MM/DD/YYYY"}</p>
                    </div>
                </div>}
            </div>
            <div className="line-filter-container"></div>
            <AnnotationFilterHeadings title={t('sources')} icon={SourcesIcon} onClearFilters={onClearFilters} keyFilter="sources" />
            <SearchAndAdd
                onChangeFilters={onChangeFilters}
                onClearFilters={onClearFilters}
                filters={filters}
                sources={annotationSources}
                selectedSources={filters.sources}
                keySources="sources"
                placeholder={t('search_sources')}
            />
            <div className="line-filter-container"></div>
            <AnnotationFilterHeadings title={t('verses')} icon={VersesIcon} onClearFilters={onClearFilters} keyFilter="verse" />
            <SearchAndAdd
                onChangeFilters={onChangeFilters}
                onClearFilters={onClearFilters}
                filters={filters}
                sources={versesOptions}
                selectedSources={filters.verse}
                keySources="verse"
                placeholder={t('search_verses')}
            />
            <div className="line-filter-container"></div>

            <div style={{ display: "flex", justifyContent: "center" }}>
                <Button secondaryAlt onClick={() => onClearFilters()}>Reset Filters</Button>
            </div>
        </div>
    </>
  )
}


const SearchAndAdd = ({
    onChangeFilters,
    onClearFilters,
    sources,
    selectedSources,
    placeholder = t('typeToSearch'),
    keySources = "sources",
}) => {
    const containerRef = useRef(null);
    const [sourcesSearch, setSourcesSearch] = useState("");

    const [showSelectBox, setShowSelectBox] = useState(false);

    const sourcesMap = useMemo(() => {
        const map:any = {};
        sources.forEach((source:any) => {
            map[source.value] = {
                name: source.label,
                profilePicture: source.profilePicture,
            };
        });
        return map;
    }, [sources]);

    useEffect(() => {
        const handler = (e) => {
          if (!containerRef.current?.contains(e.target)) {
            setShowSelectBox(false);
          }
        };
    
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
      }, []);

      const filteredSources = useMemo(() => {
        return sources.filter((source) => source.label.toLowerCase().includes(sourcesSearch.toLowerCase()));
      }, [sources, sourcesSearch]);

    return (
        <div ref={containerRef} style={{ position: "relative" }}>
            <Input
                value={sourcesSearch}
                onChangeListener={(val) => {
                    setSourcesSearch(val);
                }}
                placeholder={placeholder}
                onFocus={() => {
                    setShowSelectBox(true);
                }}
            />
            <div className="selected-sources-container">
                {Object.keys(selectedSources).map((source) => (
                    <div key={source} className="profile-chip">
                        {!!sourcesMap[source].profilePicture && <img className="profile-chip-img" src={sourcesMap[source].profilePicture} alt={sourcesMap[source].name} />}
                        <p>{sourcesMap[source].name}</p>
                        <span 
                            onClick={() => {
                                onChangeFilters(keySources, source, false);
                            }}
                            className="material-symbols-outlined"
                            style={{cursor: 'pointer'}}
                        >
                            close
                        </span>
                    </div>
                ))}
            </div>
            {showSelectBox && <div className="select-box-sources">
                {filteredSources.map((source) => (
                    <div key={source.value} className="profile-select">
                        <Checkbox
                            checked={selectedSources[source.value]}
                            onClick={(val) => {
                                onChangeFilters(keySources, source.value, val);
                            }}
                            style={{
                                height: "18px",
                                marginRight: "0.5rem",
                            }}
                            small
                        />
                        {!!source.profilePicture && <img style={{marginLeft: "1rem"}} className="profile-chip-img" src={source.profilePicture} alt={source.label} />}
                        <p>{source.label}</p>
                    </div>
                ))}
                {filteredSources.length === 0 && <p style={{ padding: "1rem" }}>No {keySources} found.</p>}
            </div>}
        </div>
    )
};


const AnnotationFilterHeadings = ({title, icon, onClearFilters, keyFilter}) => {
    return (
        <div className="annotation-filter-heading">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
               {icon && <img src={icon} alt={title} />}
                <p className="annotation-filter-heading-title">{title}</p>
            </div>
            <p onClick={() => onClearFilters(keyFilter)} className="annotation-filter-heading-clear">Clear</p>
        </div>
    )
};

return AnnotationListFilters;