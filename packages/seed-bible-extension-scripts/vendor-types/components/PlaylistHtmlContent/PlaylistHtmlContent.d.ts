import "./PlaylistHtmlContent.css";
/**
 * Renders a playlist HTML snippet. The stored value was sanitized when the item
 * was created, but playlists are publicly readable and may come from untrusted
 * authors, so the HTML is sanitized again on render via {@link setSafeHtml}.
 */
export declare function PlaylistHtmlContent(props: {
  html: string;
}): import("preact").JSX.Element;
