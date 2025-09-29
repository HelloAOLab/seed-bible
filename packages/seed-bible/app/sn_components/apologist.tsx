const { useEffect, useState, useMemo } = os.appHooks;
import { getStyleOf } from 'app.sn_styles.styler';

function formatDateISO(s) {
    if (!s) return null;
    try {
        return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch { return null; }
}

function Chips({ items }) {
    if (!items || !items.length) return null;
    return (
        <div className="sg-chips">
            {items.map((k, i) => <span className="sg-chip" key={`${k}-${i}`}>{k}</span>)}
        </div>
    );
}

function pill(text) { return text ? <span className="sg-pill">{text}</span> : null; }

function getDomain(u) {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}
function getFavicon(u) {
    const d = getDomain(u);
    if (!d) return null;
    // lightweight favicon service (works for most sites)
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64`;
}

function toEmbeddableUrl(item) {
    const url = item?.url || "";
    if (!url) return "";
    if ((item.type === "youtube" || /youtube\.com\/watch\?v=|youtu\.be\//i.test(url))) {
        const idMatch = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
        const vid = idMatch ? idMatch[1] : null;
        return vid ? `https://www.youtube.com/embed/${vid}` : url;
    }
    if (item.type === "image") return ""; // never iframe images
    return url;
}

function SgCard({ item, isOpen, onToggle }) {
    const [previewH, setPreviewH] = useState(0);
    const previewRef = useMemo(() => ({ el: null }), []);
    const [frameKey, setFrameKey] = useState(0);

    const date =
        formatDateISO(item.published_on) ||
        formatDateISO(item.created_at) ||
        null;

    const domain = useMemo(() => getDomain(item.url), [item.url]);
    const icon = useMemo(() => getFavicon(item.url), [item.url]);

    const openInNewTab = (e) => {
        e.preventDefault();
        window.open(item.url, "_blank", "noopener");
    };

    const embUrl = toEmbeddableUrl(item);
    const canPreview = Boolean(embUrl);

    // short description (whatever exists in payload)
    const desc = item.description || item.summary || item.snippet || item.excerpt || "";

    useEffect(() => {
        if (previewRef.el) {
            const h = previewRef.el.scrollHeight || 0;
            setPreviewH(h > 8 ? h : 8);
        }
    }, [isOpen, frameKey, item.url]);

    useEffect(() => {
        const onVis = () => { if (!document.hidden) setFrameKey(k => k + 1); };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, []);

    return (
        <article className={`sg-card sg2 ${isOpen ? "is-open" : ""}`}>

            <header className="sg2-head">
                <div className="sg2-headLeft">
                    {icon ? <img className="sg2-favicon" src={icon} alt="" /> : <span className="sg2-favicon sg2-fallback" />}
                    <span className="sg2-domain" title={domain}>{domain || "external"}</span>
                    {date && <>
                        <span className="sg2-dot" />
                        <span className="sg2-date">{date}</span>
                    </>}
                </div>
                <div className="sg2-headRight">
                    {item.url && (
                        <a
                            className="sg2-open"
                            href={item.url}
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

            <h3 className="sg2-title" title={item.title}>{item.title}</h3>
            {desc ? <p className="sg2-desc">{desc}</p> : null}

            <div className="sg2-tagsRow">
                <div className="sg2-tagsWrapper">
                    {Array.isArray(item.category_names) && item.category_names.length ? (
                        <>
                            <span className="sg2-tagsLabel">Tags:</span>
                            <span className="sg2-tagsText">{item.category_names.join(", ")}</span>
                        </>
                    ) : <span className="sg2-tagsEmpty"> </span>}
                </div>
                {canPreview && (
                    <button
                        className="sg2-previewLink"
                        onClick={() => onToggle(isOpen ? null : item.id)}
                        type="button"
                    >
                        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.00233 8.49999C8.78989 8.49999 9.45866 8.22432 10.0087 7.67299C10.5587 7.12166 10.8337 6.45222 10.8337 5.66466C10.8337 4.87709 10.558 4.20832 10.0067 3.65832C9.45533 3.10832 8.78589 2.83332 7.99833 2.83332C7.21076 2.83332 6.54199 3.10899 5.99199 3.66032C5.44199 4.21166 5.16699 4.88109 5.16699 5.66866C5.16699 6.45622 5.44266 7.12499 5.99399 7.67499C6.54533 8.22499 7.21476 8.49999 8.00233 8.49999ZM7.99633 7.53332C7.47676 7.53332 7.03643 7.35142 6.67533 6.98766C6.31423 6.62399 6.13366 6.18232 6.13366 5.66266C6.13366 5.14309 6.31556 4.70276 6.67933 4.34166C7.04299 3.98056 7.48466 3.79999 8.00433 3.79999C8.52389 3.79999 8.96423 3.98189 9.32533 4.34566C9.68643 4.70932 9.86699 5.15099 9.86699 5.67066C9.86699 6.19022 9.68509 6.63056 9.32133 6.99166C8.95766 7.35276 8.51599 7.53332 7.99633 7.53332ZM8.00033 10.6667C6.37809 10.6667 4.91143 10.2056 3.60033 9.28332C2.28922 8.36109 1.31144 7.15556 0.666992 5.66666C1.31144 4.17776 2.28922 2.97222 3.60033 2.04999C4.91143 1.12777 6.37809 0.666656 8.00033 0.666656C9.62256 0.666656 11.0892 1.12777 12.4003 2.04999C13.7114 2.97222 14.6892 4.17776 15.3337 5.66666C14.6892 7.15556 13.7114 8.36109 12.4003 9.28332C11.0892 10.2056 9.62256 10.6667 8.00033 10.6667ZM7.99749 9.66666C9.34383 9.66666 10.5809 9.30276 11.7087 8.57499C12.8364 7.84722 13.6948 6.87776 14.2837 5.66666C13.6948 4.45556 12.8374 3.48609 11.7115 2.75832C10.5856 2.03056 9.34949 1.66666 8.00316 1.66666C6.65683 1.66666 5.41976 2.03056 4.29199 2.75832C3.16422 3.48609 2.30033 4.45556 1.70033 5.66666C2.30033 6.87776 3.16327 7.84722 4.28916 8.57499C5.41506 9.30276 6.65116 9.66666 7.99749 9.66666Z" fill="#8ca443" />
                        </svg>
                        Preview
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
                        <div className="sg-previewBar">
                            <span className="sg-previewTitle" title={item.title}>{item.title}</span>
                            <div className="sg-previewActions">
                                <button className="sg-miniBtn" onClick={() => onToggle(null)} title="Close">
                                    <svg width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 12C0.733333 12 0.5 11.9 0.3 11.7C0.1 11.5 0 11.2667 0 11V1C0 0.733333 0.1 0.5 0.3 0.3C0.5 0.1 0.733333 0 1 0H5.65V1H1V11H11V6.35H12V11C12 11.2667 11.9 11.5 11.7 11.7C11.5 11.9 11.2667 12 11 12H1ZM4.36667 8.35L3.66667 7.63333L10.3 1H6.65V0H12V5.35H11V1.71667L4.36667 8.35Z" fill="#8ca443" />
                                    </svg>
                                    Hide
                                </button>
                            </div>
                        </div>
                        <div className="sg-iframeWrap">
                            <div className="sg-iframeBox">
                                <iframe
                                    key={frameKey}
                                    src={embUrl}
                                    title={item.title || `preview-${item.id}`}
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


const DEFAULT_URL = "https://temp-proxy-server-nu.vercel.app/proxy/search";

/**
 * Props:
 * - search: string (required)
 * - url?: string
 * - enabled?: boolean
 * - className?: string
 * - authHeader?: string
 * - cacheTtl?: number
 */
function ApologistSearch({
    search,
    url = DEFAULT_URL,
    enabled = true,
    className = "",
    authHeader = null,
    cacheTtl = null,
}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [openId, setOpenId] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!enabled || !search || !search.trim()) {
                setData([]); setErr(""); setOpenId(null); return;
            }
            setLoading(true); setErr(""); setOpenId(null);

            try {
                const headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    ...(authHeader ? { "Authorization": authHeader } : { "Authorization": "Bearer apg_TS0V0FHInZlAavPDG5MA9gCGziBz" }),
                    ...(cacheTtl ? { "x-cache-ttl": String(cacheTtl) } : { "x-cache-ttl": "300" }),
                };

                const res = await web.post(url, { query: search.trim() }, { headers });

                if (cancelled) return;
                if (res.status !== 200) { setErr(res?.error || `HTTP ${res.status}`); setData([]); return; }

                const list = Array.isArray(res?.data?.results) ? res.data.results : [];
                setData(list);
            } catch (e) {
                if (!cancelled) { setErr(e?.message || "Network error"); setData([]); }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => { cancelled = true; };
    }, [search, url, enabled, authHeader, cacheTtl]);

    if (!search?.trim()) return <div className="sg-muted">Type a search to begin…</div>;

    if (loading) {
        return (
            <div className={`sg-loading ${className}`} aria-busy="true" aria-live="polite">
                <div className="sg-spinner" role="status" aria-label="Loading" />
                <div className="sg-loading-text">Loading…</div>
                <style>{getStyleOf('tapos.css')}</style>
            </div>
        );
    }

    if (err) {
        return (
            <div className="sg-error">
                <b>Search error:</b> {err}
                <div className="sg-muted sg-small">If a preview is blocked, use “Open”.</div>
            </div>
        );
    }

    return (
        <div className={`sg-searchWrap ${className}`}>
            <h2 className="sg-heading">AI Search Results</h2>

            <div className={`sg-results ${className}`}>
                {data && data.length > 0 ? (
                    data.map((item, i) => (
                        <SgCard
                            key={item?.id ? String(item.id) : `row-${i}`}
                            item={item}
                            isOpen={openId === item.id}
                            onToggle={(id) => setOpenId(id)}
                        />
                    ))
                ) : (
                    <div className="sg-empty">
                        <div className="sg-emptyIcon">🔎</div>
                        <div className="sg-emptyTitle">No results</div>
                        <div className="sg-emptyHint">Try a broader term or different keywords.</div>
                    </div>
                )}

                <style>{getStyleOf('apologist.css')}</style>
            </div>
        </div>
    );
}

export { ApologistSearch };
