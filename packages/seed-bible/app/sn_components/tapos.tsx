// SgSearch.jsx
const { useEffect, useState, useMemo } = os.appHooks;
import { getStyleOf } from 'app.sn_styles.styler';

function formatDate(ms) {
    if (!ms) return null;
    try {
        return new Date(ms).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    } catch { return null; }
}

function Highlighted({ texts }) {
    if (!texts || !texts.length) return null;
    return (
        <div className="sg-hl">
            {texts.map((t, i) =>
                t.type === "hit"
                    ? <mark key={`hit-${i}`} className="sg-hit">{t.value}</mark>
                    : <span key={`txt-${i}`}>{t.value}</span>
            )}
        </div>
    );
}

function Chips({ items }) {
    if (!items || !items.length) return null;
    return (
        <div className="sg-chips">
            {items.map((k, i) => (
                <span className="sg-chip" key={`${k}-${i}`}>{k}</span>
            ))}
        </div>
    );
}

function CompactReferences({ refs }) {
    if (!refs) return null;
    const entries = Object.entries(refs).filter(([, arr]) => Array.isArray(arr) && arr.length > 0);
    if (!entries.length) return null;
    return (
        <div className="sg-refs">
            <div className="sg-refs-title">References</div>
            <div className="sg-refs-grid">
                {entries.map(([section, arr]) => (
                    <div className="sg-ref-block" key={`sec-${section}`}>
                        <div className="sg-ref-name">{section}</div>
                        <ul className="sg-ref-list">
                            {arr.map((v, i) => (
                                <li key={`${section}-${i}`} className="sg-ref-item">{v}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SgCard({ item, isOpen, onToggle, viewMode = "list" }) {
    const date = formatDate(item.ContentDateUTC);
    const hlName = Array.isArray(item.highlights) && item.highlights.find((h) => h.path === "Name");

    const embUrl = item?.ContentLink || "";
    const canPreview = Boolean(embUrl);

    // preview animation height + iframe remount on tab switching
    const [previewH, setPreviewH] = useState(0);
    const [frameKey, setFrameKey] = useState(0);
    const previewRef = useMemo(() => ({ el: null }), []);

    useEffect(() => {
        const onVis = () => { if (!document.hidden) setFrameKey(k => k + 1); };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, []);

    useEffect(() => {
        if (previewRef.el) {
            const h = previewRef.el.scrollHeight || 0;
            setPreviewH(h > 8 ? h : 8);
        }
    }, [isOpen, frameKey, embUrl, item.Summary, item.Keywords, item.References]);

    const openInNewTab = (e) => {
        e.preventDefault();
        if (!embUrl) return;
        window.open(embUrl, "_blank", "noopener");
    };

    const tagsText = Array.isArray(item.Keywords) && item.Keywords.length
        ? item.Keywords.join(", ")
        : "";

    return (
        <article className={`sg-card sg2 ${viewMode === "grid" ? "sg-card-grid" : "sg-card-list"} ${isOpen ? "is-open" : ""}`}>

            <header className="sg2-head">
                <div className="sg2-headLeft">
                    <span className="sg2-favicon sg2-fallback" />
                    <span className="sg2-domain" title="result">result</span>
                    {date && <>
                        <span className="sg2-dot" />
                        <span className="sg2-date">{date}</span>
                    </>}
                </div>
                <div className="sg2-headRight">
                    {canPreview && (
                        <a
                            className="sg2-open"
                            href={embUrl}
                            onClick={openInNewTab}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            title="Open in new tab"
                            aria-label="Open in new tab"
                        >
                            <svg width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 12C0.733333 12 0.5 11.9 0.3 11.7C0.1 11.5 0 11.2667 0 11V1C0 0.733333 0.1 0.5 0.3 0.3C0.5 0.1 0.733333 0 1 0H5.65V1H1V11H11V6.35H12V11C12 11.2667 11.9 11.5 11.7 11.7C11.5 11.9 11.2667 12 11 12H1ZM4.36667 8.35L3.66667 7.63333L10.3 1H6.65V0H12V5.35H11V1.71667L4.36667 8.35Z" fill="#859E3B" />
                            </svg>
                        </a>
                    )}
                </div>
            </header>

            <h3 className="sg2-title" title={item.Name}>{item.Name}</h3>
            {item.Summary
                ? <p className="sg2-desc">{item.Summary}</p>
                : null}

            <div className="sg2-tagsRow">
                {tagsText
                    ? (<>
                        <span className="sg2-tagsLabel">Tags:</span>
                        <span className="sg2-tagsText">{tagsText}</span>
                    </>)
                    : <span className="sg2-tagsEmpty"> </span>
                }

                {canPreview && !isOpen && (
                    <button
                        className="sg2-previewLink"
                        onClick={() => onToggle(item._id)}
                        type="button"
                    >
                        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.00233 8.49999C8.78989 8.49999 9.45866 8.22432 10.0087 7.67299C10.5587 7.12166 10.8337 6.45222 10.8337 5.66466C10.8337 4.87709 10.558 4.20832 10.0067 3.65832C9.45533 3.10832 8.78589 2.83332 7.99833 2.83332C7.21076 2.83332 6.54199 3.10899 5.99199 3.66032C5.44199 4.21166 5.16699 4.88109 5.16699 5.66866C5.16699 6.45622 5.44266 7.12499 5.99399 7.67499C6.54533 8.22499 7.21476 8.49999 8.00233 8.49999ZM7.99633 7.53332C7.47676 7.53332 7.03643 7.35142 6.67533 6.98766C6.31423 6.62399 6.13366 6.18232 6.13366 5.66266C6.13366 5.14309 6.31556 4.70276 6.67933 4.34166C7.04299 3.98056 7.48466 3.79999 8.00433 3.79999C8.52389 3.79999 8.96423 3.98189 9.32533 4.34566C9.68643 4.70932 9.86699 5.15099 9.86699 5.67066C9.86699 6.19022 9.68509 6.63056 9.32133 6.99166C8.95766 7.35276 8.51599 7.53332 7.99633 7.53332ZM8.00033 10.6667C6.37809 10.6667 4.91143 10.2056 3.60033 9.28332C2.28922 8.36109 1.31144 7.15556 0.666992 5.66666C1.31144 4.17776 2.28922 2.97222 3.60033 2.04999C4.91143 1.12777 6.37809 0.666656 8.00033 0.666656C9.62256 0.666656 11.0892 1.12777 12.4003 2.04999C13.7114 2.97222 14.6892 4.17776 15.3337 5.66666C14.6892 7.15556 13.7114 8.36109 12.4003 9.28332C11.0892 10.2056 9.62256 10.6667 8.00033 10.6667ZM7.99749 9.66666C9.34383 9.66666 10.5809 9.30276 11.7087 8.57499C12.8364 7.84722 13.6948 6.87776 14.2837 5.66666C13.6948 4.45556 12.8374 3.48609 11.7115 2.75832C10.5856 2.03056 9.34949 1.66666 8.00316 1.66666C6.65683 1.66666 5.41976 2.03056 4.29199 2.75832C3.16422 3.48609 2.30033 4.45556 1.70033 5.66666C2.30033 6.87776 3.16327 7.84722 4.28916 8.57499C5.41506 9.30276 6.65116 9.66666 7.99749 9.66666Z" fill="#8ca443" />
                        </svg>
                        Preview
                    </button>
                )}
                {canPreview && isOpen && (
                    <button
                        className="sg2-previewLink"
                        onClick={() => onToggle(item._id)}
                        type="button"
                    >
                        <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.4833 8.01671L9.75 7.28337C10.0389 6.49447 9.8889 5.83894 9.3 5.31671C8.7111 4.79447 8.07223 4.66114 7.38333 4.91671L6.65 4.18337C6.8389 4.06114 7.05 3.97227 7.28333 3.91671C7.51666 3.86114 7.75556 3.83337 8 3.83337C8.7889 3.83337 9.45833 4.10837 10.0083 4.65837C10.5583 5.20837 10.8333 5.87781 10.8333 6.66671C10.8333 6.91114 10.8028 7.15281 10.7417 7.39171C10.6806 7.63061 10.5944 7.83894 10.4833 8.01671ZM12.6333 10.1667L11.9667 9.50004C12.5111 9.10004 12.9861 8.65281 13.3917 8.15837C13.7972 7.66394 14.0944 7.16671 14.2833 6.66671C13.7278 5.43337 12.8944 4.45837 11.7833 3.74171C10.6722 3.02504 9.46666 2.66671 8.16666 2.66671C7.7 2.66671 7.22223 2.71114 6.73333 2.80004C6.24443 2.88894 5.8611 2.99447 5.58333 3.11671L4.81666 2.33337C5.20556 2.1556 5.70276 2.00004 6.30833 1.86671C6.9139 1.73337 7.50556 1.66671 8.08333 1.66671C9.67223 1.66671 11.125 2.11948 12.4417 3.02504C13.7583 3.93061 14.7222 5.14447 15.3333 6.66671C15.0444 7.37781 14.6722 8.02781 14.2167 8.61671C13.7611 9.20561 13.2333 9.72227 12.6333 10.1667ZM13.6 13.9334L10.8 11.1834C10.4111 11.3389 9.97223 11.4584 9.48333 11.5417C8.99443 11.625 8.5 11.6667 8 11.6667C6.37776 11.6667 4.90556 11.2139 3.58333 10.3084C2.26111 9.40281 1.28889 8.18894 0.666664 6.66671C0.888887 6.08894 1.19722 5.52504 1.59166 4.97504C1.98611 4.42504 2.46666 3.90004 3.03333 3.40004L0.933331 1.30004L1.63333 0.583374L14.25 13.2L13.6 13.9334ZM3.71666 4.10004C3.30555 4.40004 2.90833 4.79447 2.525 5.28337C2.14166 5.77227 1.86666 6.23337 1.7 6.66671C2.26666 7.90004 3.11944 8.87504 4.25833 9.59171C5.39723 10.3084 6.6889 10.6667 8.13333 10.6667C8.5 10.6667 8.8611 10.6445 9.21666 10.6C9.57223 10.5556 9.8389 10.4889 10.0167 10.4L8.95 9.33337C8.82776 9.38894 8.67776 9.43061 8.5 9.45837C8.32223 9.48614 8.15556 9.50004 8 9.50004C7.22223 9.50004 6.55556 9.22781 6 8.68337C5.44443 8.13894 5.16666 7.46671 5.16666 6.66671C5.16666 6.50004 5.18056 6.33337 5.20833 6.16671C5.2361 6.00004 5.27776 5.85004 5.33333 5.71671L3.71666 4.10004Z" fill="#8ca443" />
                        </svg>

                        Hide
                    </button>
                )}
            </div>

            <div
                className="sg-previewAnim"
                style={{ "--sg-preview-h": `${previewH}px` }}
                aria-hidden={!isOpen}
            >
                {isOpen && canPreview && (
                    <div className="sg-preview" ref={(n) => (previewRef.el = n)}>
                        <div className="sg-cardBody">
                            {hlName && <Highlighted texts={hlName.texts} />}
                            {item.Summary && <p className="sg-summary">{item.Summary}</p>}
                            <Chips items={item.Keywords} />
                            <CompactReferences refs={item.References} />
                        </div>

                        <div className="sg-iframeWrap">
                            <div className="sg-iframeBox">
                                <iframe
                                    key={frameKey}
                                    src={embUrl}
                                    title={item.Name || `preview-${item._id}`}
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}

const DEFAULT_URL = "https://splinteredglass.retool.com/url/search";
const DEFAULT_ORG = "67355031aea5f406546577d0";

function SgSearch({
    search,
    organizationId = DEFAULT_ORG,
    authHeader = null,
    url = DEFAULT_URL,
    enabled = true,
    className = "",
}) {
    const [data, setData] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [openIds, setOpenIds] = useState(new Set());
    const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [displayedCount, setDisplayedCount] = useState(10);
    const [allData, setAllData] = useState([]);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!enabled || !search || !search.trim()) {
                   setData([]); setAllData([]); setMessage(""); setErr(""); setOpenIds(new Set()); setHasMore(false); setDisplayedCount(10);
                return;
            }
            setLoading(true); setErr(""); setOpenIds(new Set()); setHasMore(false); setDisplayedCount(10);

            try {
                const res = await web.post(
                    url,
                    { 
                        _OrganizationId: organizationId, 
                        search: search.trim(),
                        limit: 100 // Get all results
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            ...(authHeader ? { "Authorization": authHeader } : {}),
                        },
                    }
                );

                if (cancelled) return;

                if (res.status !== 200) {
                    setErr(res?.error || `HTTP ${res.status}`);
                    setData([]); setAllData([]); setMessage(""); setOpenIds(new Set());
                    return;
                }

                const allResults = Array.isArray(res?.data?.data) ? res.data.data : [];
                setAllData(allResults);
                setData(allResults.slice(0, 10)); // Show first 10
                setMessage(res?.data?.message || "");
                setHasMore(allResults.length > 10); // Show "Load More" if there are more than 10 results
                // Open all cards initially
                setOpenIds(new Set(allResults.map((item) => item._id)));
            } catch (e) {
                if (!cancelled) {
                    setErr(e?.message || "Network error");
                    setData([]); setAllData([]); setMessage(""); setOpenIds(new Set());
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => { cancelled = true; };
    }, [search, organizationId, authHeader, url, enabled]);

    const loadMore = () => {
        if (loadingMore || !hasMore) return;
        
        setLoadingMore(true);
        
        // Simulate loading delay for better UX
        setTimeout(() => {
            const newDisplayedCount = displayedCount + 10;
            const newData = allData.slice(0, newDisplayedCount);
            
            setData(newData);
            setDisplayedCount(newDisplayedCount);
            setHasMore(newDisplayedCount < allData.length);
            setLoadingMore(false);
        }, 300);
    };

    if (!search?.trim()) {
        return <div className="sg-muted">Type a search to begin…</div>;
    }

    if (loading) {
        return (
            <div className={`sg-loading ${className}`} aria-busy="true" aria-live="polite">
                <div className="sg-spinner" role="status" aria-label="Loading" />
                <div className="sg-loading-text">Loading…</div>
                <style>{getStyleOf('apologist.css')}</style>
            </div>
        );
    }

    if (err) {
        return (
            <div className="sg-error">
                <b>Search error:</b> {err}
                <div className="sg-muted sg-small">If you see a CORS error, allow this origin in Retool or use a proxy.</div>
                <style>{getStyleOf('apologist.css')}</style>
            </div>
        );
    }

    return (
        <div className={`sg-searchWrap ${className}`}>
            <div className="sg-header">
                <h2 className="sg-heading">Related Content</h2>
                {data && data.length > 0 && (
                    <div className="sg-headerTop">
                        <div className="sg-resultCount">{data.length} Results</div>
                        <div className="sg-viewToggle">
                            <button
                                className={`sg-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                                onClick={() => setViewMode("list")}
                                title="List View"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_439_369)">
                                        <path d="M14 5L2 5C1.73487 4.99971 1.48069 4.89426 1.29321 4.70679C1.10574 4.51931 1.00029 4.26513 1 4L1 2C1.00028 1.73487 1.10572 1.48068 1.2932 1.2932C1.48068 1.10572 1.73487 1.00028 2 1L14 1C14.2651 1.00028 14.5193 1.10572 14.7068 1.2932C14.8943 1.48068 14.9997 1.73487 15 2V4C14.9997 4.26513 14.8943 4.51931 14.7068 4.70679C14.5193 4.89426 14.2651 4.99971 14 5ZM2 2L2 4L14 4V2L2 2Z" fill="currentColor"/>
                                        <path d="M14 15L2 15C1.73487 14.9997 1.48069 14.8943 1.29321 14.7068C1.10574 14.5193 1.00029 14.2651 1 14L1 12C1.00028 11.7349 1.10572 11.4807 1.2932 11.2932C1.48068 11.1057 1.73487 11.0003 2 11L14 11C14.2651 11.0003 14.5193 11.1057 14.7068 11.2932C14.8943 11.4807 14.9997 11.7349 15 12V14C14.9997 14.2651 14.8943 14.5193 14.7068 14.7068C14.5193 14.8943 14.2651 14.9997 14 15ZM2 12L2 14L14 14V12L2 12Z" fill="currentColor"/>
                                        <path d="M14 10L2 10C1.73487 9.99971 1.48069 9.89426 1.29321 9.70679C1.10574 9.51931 1.00029 9.26513 1 9L1 7C1.00028 6.73487 1.10572 6.48068 1.2932 6.2932C1.48068 6.10572 1.73487 6.00028 2 6L14 6C14.2651 6.00028 14.5193 6.10572 14.7068 6.2932C14.8943 6.48068 14.9997 6.73487 15 7V9C14.9997 9.26513 14.8943 9.51931 14.7068 9.70679C14.5193 9.89426 14.2651 9.99971 14 10ZM2 7L2 9L14 9V7L2 7Z" fill="currentColor"/>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_439_369">
                                            <rect width="16" height="16" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                            </button>
                            <button
                                className={`sg-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                                onClick={() => setViewMode("grid")}
                                title="Grid View"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_439_733)">
                                        <path d="M15 2L15 14C14.9997 14.2651 14.8943 14.5193 14.7068 14.7068C14.5193 14.8943 14.2651 14.9997 14 15L10 15C9.73487 14.9997 9.48068 14.8943 9.2932 14.7068C9.10572 14.5193 9.00028 14.2651 9 14L9 2C9.00028 1.73487 9.10572 1.48068 9.2932 1.2932C9.48068 1.10572 9.73487 1.00028 10 1L14 1C14.2651 1.00028 14.5193 1.10572 14.7068 1.2932C14.8943 1.48068 14.9997 1.73487 15 2ZM10 14L14 14L14 2L10 2L10 14Z" fill="currentColor"/>
                                        <path d="M7 2L7 14C6.99972 14.2651 6.89428 14.5193 6.7068 14.7068C6.51932 14.8943 6.26513 14.9997 6 15L2 15C1.73487 14.9997 1.48068 14.8943 1.2932 14.7068C1.10572 14.5193 1.00028 14.2651 1 14L0.999999 2C1.00028 1.73487 1.10572 1.48068 1.2932 1.2932C1.48068 1.10572 1.73487 1.00028 2 1L6 1C6.26513 1.00028 6.51932 1.10572 6.7068 1.2932C6.89428 1.48068 6.99972 1.73487 7 2ZM2 14L6 14L6 2L2 2L2 14Z" fill="currentColor"/>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_439_733">
                                            <rect width="16" height="16" fill="white" transform="translate(0 16) rotate(-90)"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`sg-results ${viewMode === "grid" ? "sg-grid" : "sg-list"} ${className}`} key={`results-${Boolean(data?.length)}-${search}`}>
                {data && data.length > 0 ? (
                    <>
                        {data.map((item, i) => (
                            <SgCard
                                key={item?._id ? String(item._id) : `row-${i}`}
                                item={item}
                                isOpen={openIds.has(item._id)}
                                onToggle={(id) => {
                                    setOpenIds(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(id)) {
                                            newSet.delete(id);
                                        } else {
                                            newSet.add(id);
                                        }
                                        return newSet;
                                    });
                                }}
                                viewMode={viewMode}
                            />
                        ))}
                        {hasMore && (
                            <div className="sg-loadMore">
                                <button 
                                    className="sg-loadMoreBtn" 
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="sg-spinner-small"></div>
                                            Loading...
                                        </>
                                    ) : (
                                        'Load More'
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="sg-empty">
                        <div className="sg-emptyIcon">🔎</div>
                        <div className="sg-emptyTitle">No results</div>
                        <div className="sg-emptyHint">Try a broader term or different keywords.</div>
                    </div>
                )}
            </div>

            <style>{getStyleOf('apologist.css')}</style>
        </div>
    );
}

globalThis.TaposSearch = SgSearch;
export { SgSearch };
