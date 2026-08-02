/**
 * How a `link` playlist item should be presented, decided from its URL:
 * - `video`: a direct video file — render in a `<video>` element.
 * - `embed`: a known video site (YouTube, Vimeo) — render `url` (already the
 *   site's embed URL) in an `<iframe>`.
 * - `link`: anything else — show the URL with an "Open" button.
 */
export type LinkMedia =
  | {
      kind: "video";
      url: string;
    }
  | {
      kind: "embed";
      url: string;
    }
  | {
      kind: "link";
      url: string;
    };
/**
 * Classifies a link URL so the play view knows how to render it. Falls back to
 * a plain link for anything unrecognized or unparseable.
 */
export declare function resolveLinkMedia(rawUrl: string): LinkMedia;
