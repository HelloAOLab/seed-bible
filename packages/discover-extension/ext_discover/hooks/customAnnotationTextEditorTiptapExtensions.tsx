import { Image, Mark, Node } from "https://esm.helloao.org/vendor-RPNXNWQB.js";

const G = globalThis as Record<string, any>;

export const LineHeight = Mark.create({
  name: "lineHeight",
  addAttributes() {
    return {
      lineHeight: {
        default: null,
        parseHTML: (el: any) => el.style.lineHeight || null,
        renderHTML: (attrs: any) =>
          attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
      },
      id: {
        default: null,
        parseHTML: (el: any) => el.getAttribute("id"),
        renderHTML: (attrs: any) => (attrs.id ? { id: attrs.id } : {}),
      },
    };
  },
  parseHTML() {
    return [{ style: "line-height" }];
  },
  renderHTML(props: any) {
    return ["span", props.HTMLAttributes, 0];
  },
});

export const CustomSpan = Node.create({
  name: "customSpan",
  group: "inline",
  inline: true,
  content: "inline*",
  atom: false,
  addAttributes() {
    return {
      id: { default: null },
      style: { default: null },
      className: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "span" }];
  },
  renderHTML(props: any) {
    const { HTMLAttributes } = props;
    const { id, style, className } = HTMLAttributes;
    return [
      "span",
      {
        ...(id ? { id } : {}),
        ...(style ? { style } : {}),
        ...(className ? { className } : {}),
      },
      0,
    ];
  },
  addNodeView() {
    return (props: any) => {
      const { node } = props;
      const el = document.createElement("span");
      if (node.attrs.id) el.setAttribute("id", node.attrs.id);
      if (node.attrs.style) el.setAttribute("style", node.attrs.style);
      if (node.attrs.className) el.setAttribute("class", node.attrs.className);
      return { dom: el, contentDOM: el };
    };
  },
});

export const CustomDiv = Node.create({
  name: "customDiv",
  group: "inline",
  inline: true,
  content: "inline*",
  atom: false,
  addAttributes() {
    return {
      id: { default: null },
      style: { default: null },
      className: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "div" }];
  },
  renderHTML(props: any) {
    const { HTMLAttributes } = props;
    const { id, style, className } = HTMLAttributes;
    return [
      "div",
      {
        ...(id ? { id } : {}),
        ...(style ? { style } : {}),
        ...(className ? { className } : {}),
      },
      0,
    ];
  },
  addNodeView() {
    return (props: any) => {
      const { node } = props;
      const el = document.createElement("div");
      if (node.attrs.id) el.setAttribute("id", node.attrs.id);
      if (node.attrs.className) el.setAttribute("class", node.attrs.className);
      if (node.attrs.style) el.setAttribute("style", node.attrs.style);
      return { dom: el, contentDOM: el };
    };
  },
});

export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      style: { default: "max-width: 360px;" },
    };
  },
  parseHTML() {
    return [{ tag: "video" }];
  },
  renderHTML(props: any) {
    const { HTMLAttributes } = props;
    return ["video", { ...HTMLAttributes, controls: true }];
  },
  addNodeView() {
    return (props: any) => {
      const { node } = props;
      const el = document.createElement("video");
      Object.entries(node.attrs).forEach(([key, value]: any) => {
        if (value !== null) el.setAttribute(key, value);
      });
      el.setAttribute("controls", "true");
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!node.attrs.src) return;
        thisBot.VideoPlayer({ src: node.attrs.src });
      });
      return { dom: el };
    };
  },
});

export const Iframe = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: "560" },
      height: { default: "315" },
      frameborder: { default: "0" },
      allow: {
        default:
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      },
      allowfullscreen: { default: true },
      style: { default: "max-width: 100%;" },
    };
  },
  parseHTML() {
    return [{ tag: "iframe" }];
  },
  renderHTML(props: any) {
    const { HTMLAttributes } = props;
    return ["iframe", { ...HTMLAttributes, allowfullscreen: "true" }];
  },
  addNodeView() {
    return (props: any) => {
      const { node } = props;
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "inline-block";
      const iframe = document.createElement("iframe");
      Object.entries(node.attrs).forEach(([k, v]: any) => {
        if (v !== null) iframe.setAttribute(k, v);
      });
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.zIndex = "10";
      overlay.style.cursor = "pointer";
      overlay.style.background = "transparent";
      overlay.style.pointerEvents = "auto";
      overlay.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!node.attrs.src) return;
        const linkDetails = G.validateUrl(node.attrs.src);
        if (linkDetails.isValid && linkDetails.type === "youtube") {
          thisBot.VideoPlayer({
            src: node.attrs.src,
            isYoutube: true,
            videoID: linkDetails.videoId,
          });
          return;
        }
        if (linkDetails.isValid && linkDetails.type === "video") {
          thisBot.VideoPlayer({ src: node.attrs.src });
          return;
        }
        if (linkDetails.isValid && linkDetails.type === "externalLink") {
          G.SetOpenExternalLink && G.SetOpenExternalLink(node.attrs.src);
        }
      });
      wrapper.appendChild(iframe);
      wrapper.appendChild(overlay);
      return { dom: wrapper };
    };
  },
});

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (element: any) => element.getAttribute("class"),
        renderHTML: (attributes: any) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
});

export const Audio = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null, parseHTML: (el: any) => el.getAttribute("src") },
      controls: {
        default: true,
        parseHTML: (el: any) => el.hasAttribute("controls"),
        renderHTML: (attrs: any) =>
          attrs.controls ? { controls: "true" } : {},
      },
      preload: {
        default: "metadata",
        parseHTML: (el: any) => el.getAttribute("preload") || "metadata",
      },
      loop: {
        default: false,
        parseHTML: (el: any) => el.hasAttribute("loop"),
        renderHTML: (attrs: any) => (attrs.loop ? { loop: "true" } : {}),
      },
      muted: {
        default: false,
        parseHTML: (el: any) => el.hasAttribute("muted"),
        renderHTML: (attrs: any) => (attrs.muted ? { muted: "true" } : {}),
      },
      class: {
        default: null,
        parseHTML: (el: any) => el.getAttribute("class"),
      },
      style: {
        default: null,
        parseHTML: (el: any) => el.getAttribute("style"),
      },
    };
  },
  parseHTML() {
    return [{ tag: "audio" }];
  },
  renderHTML(props: any) {
    const { HTMLAttributes } = props;
    const attrs = {
      ...HTMLAttributes,
      controls: HTMLAttributes.controls ? "true" : null,
      loop: HTMLAttributes.loop ? "true" : null,
      muted: HTMLAttributes.muted ? "true" : null,
    };
    Object.keys(attrs).forEach((k) => {
      if (attrs[k] === null || attrs[k] === undefined) delete attrs[k];
    });
    return ["audio", attrs];
  },
});

export function getPlaylistID(list: any) {
  let name = "🎶";
  const firstItem = list.find((ele: any) => G.ValidTypes[ele?.type]);
  if (firstItem) {
    const lowerCase = firstItem?.additionalInfo?.book?.toLocaleLowerCase();
    name =
      firstItem.additionalInfo.data.bookId ||
      firstItem.additionalInfo.data.id ||
      firstItem.additionalInfo.data.bookId ||
      firstItem.additionalInfo.chapterData.id ||
      firstItem.additionalInfo.chapterData.bookId ||
      thisBot.tags.LowerCaseBookMapping[lowerCase];
  }
  return name;
}
