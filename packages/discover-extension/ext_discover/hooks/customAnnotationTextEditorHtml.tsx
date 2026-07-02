const G = globalThis as Record<string, any>;

export function clamp(n: any, a: any, b: any) {
  return Math.max(a, Math.min(b, n));
}

export function escapeHTML(s: any) {
  return s.replace(
    /[&<>"]/g,
    (c: string) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
}

const MEDIA_OPEN_TAG_REGEX = /<(img|video|audio|iframe)\b[\s\S]*?>/gi;
const MEDIA_CLOSE_TAG_REGEX = /<\/(video|audio|iframe)\s*>/gi;
const PLAYLIST_BLOCK_REGEX =
  /<div\s+(?:class|classname)="playlist-wrapper-sre"[^>]*>\s*<div[^>]*id="([^"]+)"[^>]*(?:class|classname)="playlist-container-sre"[^>]*>[\s\S]*?<span[^>]*(?:class|classname)="playlist-icon-sre"[^>]*>\s*([^<]+)\s*<\/span>[\s\S]*?<span[^>]*(?:class|classname)="playlist-label-sre"[^>]*>\s*([^<]+)\s*<\/span>[\s\S]*?<\/div>\s*<\/div>/gi;

function escapePlaylistBlocks(html: any) {
  return html.replace(
    PLAYLIST_BLOCK_REGEX,
    (_: any, id: any, icon: any, label: any) => {
      return `
  <p>
    <span id="${id}">
      &lt; [${icon}] -----|---- [${label}]/&gt;
    </span>
  </p>
  `.trim();
    }
  );
}

export function fakeEscapeMediaTags(html = "", showPreview = false) {
  if (showPreview) return html;
  html = escapePlaylistBlocks(html);
  let htmlToReturn = html
    .replace(MEDIA_OPEN_TAG_REGEX, (tag) =>
      tag.replace(/</g, "‹").replace(/>/g, "›")
    )
    .replace(MEDIA_CLOSE_TAG_REGEX, (tag) =>
      tag.replace(/</g, "‹").replace(/>/g, "›")
    );
  if (G.NeedToRemoveEmptyPTags) {
    G.NeedToRemoveEmptyPTags = false;
    htmlToReturn = htmlToReturn?.replace(
      /(<p>\s*<span id="[^"]+">[\s\S]*?<\/span>\s*<\/p>)\s*<p[^>]*>\s*(?:<br[^>]*>)?\s*<\/p>/i,
      "$1"
    );
    htmlToReturn = htmlToReturn?.replace(
      /<p[^>]*>\s*(?:<br[^>]*>)?\s*<\/p>\s*(<p>\s*<span id="[^"]+">[\s\S]*?<\/span>\s*<\/p>)/i,
      "$1"
    );
  }
  return htmlToReturn;
}

const P_BLOCK_REGEX = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
const FAKE_MEDIA_BLOCK_REGEX =
  /‹(img|video|audio|iframe)\b([\s\S]*?)\/?›(?:\s*‹\/\1›)?/gi;
const SELECTION_MARKER_REGEX =
  /<p[^>]*>\s*<span[^>]*id="([^"]+)"[^>]*>\s*&lt;\s*\[(\w+)\][\s-]*\|\s*[\s-]*\[(\w+)\]\s*\/&gt;\s*<\/span>[\s\S]*?<\/p>/gi;

function replaceSelectionMarkers(html: any) {
  return html.replace(
    SELECTION_MARKER_REGEX,
    (_: any, id: any, icon: any, label: any) => {
      return `
  <div className="playlist-wrapper-sre">
    <div
      id="${id}"
      className="playlist-container-sre"
      data-icon="${icon}"
      data-label="${label}"
    >
      <span className="playlist-icon-sre">${icon}</span>
      <span className="playlist-label-sre">${label}</span>
      <span id="${id}" className="material-symbols-outlined sre-play-circle sre-play-circle-${id}">play_circle</span> 
    </div>
  </div>
  `.trim();
    }
  );
}

export function fakeUnescapeMediaTags(html: any) {
  html = replaceSelectionMarkers(html);
  return html.replace(P_BLOCK_REGEX, (fullP: any, inner: any) => {
    const media = [];
    let match;
    while ((match = FAKE_MEDIA_BLOCK_REGEX.exec(inner)) !== null) {
      const [, tag, attrs] = match;
      media.push(
        tag === "img" ? `<img${attrs} />` : `<${tag}${attrs}></${tag}>`
      );
    }
    const leftoverText = inner.replace(FAKE_MEDIA_BLOCK_REGEX, "").trim();
    if (media.length && leftoverText === "") {
      return media.join("\n");
    }
    if (media.length) {
      return (
        media.join("\n") + (leftoverText ? `\n<p>${leftoverText}</p>` : "")
      );
    }
    return fullP;
  });
}

export function triggerDownload(blob: any, filename: any) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
