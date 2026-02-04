const { useEffect, useState, useRef, useMemo } = os.appHooks;
const { Button, Input } = Components;
const RecordingUI = await thisBot.RecordVoice();
const VideoRecordUI = await thisBot.VideoRecordUI();
import {
  ColorizeParagraphs,
  uncolorizeHashtags,
} from "playlist.playlistMode.AutoTag";
import { SelectionOptions } from "playlist.playlistMode.SelectionOptions";

import {
  Editor,
  StarterKit,
  TextStyle,
  Color,
  TextAlign,
  Underline,
  Superscript,
  Subscript,
  Highlight,
  Image,
  Link,
  BulletList,
  Node,
  OrderedList,
  ListItem,
  Mark,
  Extension,
  Plugin,
} from "https://esm.helloao.org/vendor-RPNXNWQB.js";
import { useDragRef } from "playlist.playlistMode.useDragRef";

const RECORDING_TYPES = {
  audio: "audio/webm",
  video: "video/mp4",
  link: "link",
};

/**
 * -----------------------------------------------------------
 *  SimpleRichEditor
 *  - app-agnostic, reusable TipTap editor with responsive
 *    toolbar + overflow tray and priority system.
 * -----------------------------------------------------------
 *
 * Props:
 * - instanceId?: string (default: auto)
 * - className?: string
 * - style?: object
 * - minHeight?: number (default 300)
 * - initialText?: string
 * - initialHTML?: string
 * - placeholderHTML?: string (default: "Hello World")
 * - readOnly?: boolean
 * - priorityKey?: string (localStorage key for priorities)
 * - defaultPriority?: string[] (override default toolbar ordering)
 * - onChange?: (html: string, json: object) => void
 * - onAIHighlight?: (currentHTML: string) => Promise<string> (return HTML)
 *
 * Programmatic API:
 *   window.SimpleEditorToolbar[instanceId].setPriorities(ids[])
 *   window.SimpleEditorToolbar[instanceId].getPriorities()
 *   window.SimpleEditorToolbar[instanceId].resetPriorities()
 */

const defaultProfile =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5ae46570b2daba6e99c5b71de2cf41cfd9dfaf46e04c9eb9344146955ddb9a31.svg";

const DEFAULT_TOOLBAR_PRIORITY = [
  "mic",
  "video",
  "slash",
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "superscript",
  "subscript",
  "align",
  "list",
  "line-spacing",
  "text-color",
  "bg-color",
  "paragraph",
  "font-family",
  "font-style",
  "font-size",
  "undo",
  "redo",
  "clear",
  "print",
  "margins-y",
  "margins-x",
  "link",
  "image",
  "download",
  "upload",
  "ai",
  "tune",
];

const COMMAND_BOX_OPTIONS = [
  {
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/95176265a3a33a0077c8b11b493470df3393acfc3ff5411c8fe45976d96be46d.svg",
    label: "Link",
    onClick: () => {
      globalThis.ThruCommandBox = true;
      shout("startRecording", RECORDING_TYPES.link);
    },
  },
  // {
  //   icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/76dc5c6ea24d635c2a1f363dc5d3822a618a56ff3484f36795f2bf4ae99ae3c4.svg",
  //   label: "Add Tags",
  //   onClick: () => {
  //     // Notify coming soon
  //     ShowNotification({
  //       message: "Coming soon!",
  //       severity: "info",
  //     });
  //   },
  // },
  {
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/8b01074656e936022bbb1655a94e85ba3f9af15d2873d6bd16d01d07d66bdf8b.svg",
    label: "File",
    onClick: async () => {
      const files = await os.showUploadFiles();
      shout("onHandleDropFiles", { files, thruCommandBox: true });
    },
  },
  {
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/14c602cebbe4c6872c9fcf80015865c3b3f70391608bf58b92ad1cc8e068212c.svg",
    label: "Playlist",
    onClick: () => {
      globalThis.ThruCommandBox = true;
      // Notify coming soon
      shout("togglePlaylistSuggestions");
    },
  },
];

const COMMAND_ICON =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/ce7430bae3a8fd021160a12806b2b82a5999a463b2bff278a96f922963fe5cfc.svg";

// ---- custom mark: lineHeight (same behavior as your app editor)
const LineHeight = Mark.create({
  name: "lineHeight",
  addAttributes() {
    return {
      lineHeight: {
        default: null,
        parseHTML: (el) => el.style.lineHeight || null,
        renderHTML: (attrs) =>
          attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
      },
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("id"),
        renderHTML: (attrs) => (attrs.id ? { id: attrs.id } : {}),
      },
    };
  },
  parseHTML() {
    return [{ style: "line-height" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

export const CustomSpan = Node.create({
  name: "customSpan",

  group: "inline",
  inline: true,
  content: "inline*", // ✅ allow text inside
  atom: false, // ✅ important (or remove this line)

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

  renderHTML({ HTMLAttributes }) {
    const { id, style, className } = HTMLAttributes;

    return [
      "span",
      {
        ...(id ? { id } : {}),
        ...(style ? { style } : {}),
        ...(className ? { className } : {}),
      },
      0, // ✅ keeps the inner text
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const el = document.createElement("span");

      if (node.attrs.id) el.setAttribute("id", node.attrs.id);
      if (node.attrs.style) el.setAttribute("style", node.attrs.style);
      if (node.attrs.className) el.setAttribute("class", node.attrs.className);
      return {
        dom: el,
        contentDOM: el, // ✅ text goes inside span
      };
    };
  },
});

export const CustomDiv = Node.create({
  name: "customDiv",

  group: "inline",
  inline: true,
  content: "inline*", // ✅ allow text inside
  atom: false, // ✅ important (or remove this line)

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

  renderHTML({ HTMLAttributes }) {
    const { id, style, className } = HTMLAttributes;

    return [
      "div",
      {
        ...(id ? { id } : {}),
        ...(style ? { style } : {}),
        ...(className ? { className } : {}),
      },
      0, // ✅ keeps the inner text
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const el = document.createElement("div");

      if (node.attrs.id) el.setAttribute("id", node.attrs.id);
      if (node.attrs.className) el.setAttribute("class", node.attrs.className);
      if (node.attrs.style) el.setAttribute("style", node.attrs.style);

      return {
        dom: el,
        contentDOM: el, // ✅ text goes inside span
      };
    };
  },
});

export const Video = Node.create({
  name: "video",

  group: "block",
  atom: true, // makes it behave like a single unit

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      style: { default: "max-width: 360px;" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      {
        ...HTMLAttributes,
        controls: true,
      },
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const el = document.createElement("video");

      // apply attributes
      Object.entries(node.attrs).forEach(([key, value]) => {
        if (value !== null) el.setAttribute(key, value);
      });

      el.setAttribute("controls", "true");

      // ⭐ Add REAL JS event listener
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!node.attrs.src) return;
        thisBot.VideoPlayer({
          src: node.attrs.src,
        });
      });

      return {
        dom: el,
      };
    };
  },
});

export const Iframe = Node.create({
  name: "iframe",

  group: "block",
  atom: true, // behaves as a single unit
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: "560",
      },
      height: {
        default: "315",
      },
      frameborder: {
        default: "0",
      },
      allow: {
        default:
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      },
      allowfullscreen: {
        default: true,
      },
      style: {
        default: "max-width: 100%;",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "iframe",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      {
        ...HTMLAttributes,
        allowfullscreen: "true",
      },
    ];
  },

  addNodeView() {
    return ({ node }) => {
      /** Wrapper */
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "inline-block";

      /** iframe */
      const iframe = document.createElement("iframe");
      Object.entries(node.attrs).forEach(([k, v]) => {
        if (v !== null) iframe.setAttribute(k, v);
      });

      /** Invisible overlay that captures the click */
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.zIndex = "10";
      overlay.style.cursor = "pointer";
      overlay.style.background = "transparent";
      overlay.style.pointerEvents = "auto"; // important

      overlay.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!node.attrs.src) return;

        const linkDetails = validateUrl(node.attrs.src);

        if (linkDetails.isValid && linkDetails.type === "youtube") {
          thisBot.VideoPlayer({
            src: node.attrs.src,
            isYoutube: true,
            videoID: linkDetails.videoId,
          });
          return;
        }

        if (linkDetails.isValid && linkDetails.type === "video") {
          thisBot.VideoPlayer({
            src: node.attrs.src,
          });
          return;
        }

        if (linkDetails.isValid && linkDetails.type === "externalLink") {
          os.openURL(node.attrs.src);
          return;
        }
      });

      wrapper.appendChild(iframe);
      wrapper.appendChild(overlay);

      return {
        dom: wrapper,
      };
    };
  },
});

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) {
            return {};
          }

          return {
            class: attributes.class,
          };
        },
      },
    };
  },
});

const Audio = Node.create({
  name: "audio",

  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute("src"),
      },
      controls: {
        default: true,
        parseHTML: (el) => el.hasAttribute("controls"),
        renderHTML: (attrs) => (attrs.controls ? { controls: "true" } : {}),
      },
      preload: {
        default: "metadata",
        parseHTML: (el) => el.getAttribute("preload") || "metadata",
      },
      loop: {
        default: false,
        parseHTML: (el) => el.hasAttribute("loop"),
        renderHTML: (attrs) => (attrs.loop ? { loop: "true" } : {}),
      },
      muted: {
        default: false,
        parseHTML: (el) => el.hasAttribute("muted"),
        renderHTML: (attrs) => (attrs.muted ? { muted: "true" } : {}),
      },
      class: {
        default: null,
        parseHTML: (el) => el.getAttribute("class"),
      },
      style: {
        default: null,
        parseHTML: (el) => el.getAttribute("style"),
      },
    };
  },

  parseHTML() {
    return [{ tag: "audio" }];
  },

  renderHTML({ HTMLAttributes }) {
    // Normalize boolean attrs so they appear in DOM correctly
    const attrs = {
      ...HTMLAttributes,
      controls: HTMLAttributes.controls ? "true" : null,
      loop: HTMLAttributes.loop ? "true" : null,
      muted: HTMLAttributes.muted ? "true" : null,
    };

    // Remove null entries (ProseMirror tolerates null)
    Object.keys(attrs).forEach((k) => {
      if (attrs[k] === null || attrs[k] === undefined) delete attrs[k];
    });

    return ["audio", attrs];
  },
});

const PlaylistID = (list: any) => {
  let name = "🎶";
  const firstItem = list.find((ele) => globalThis.ValidTypes[ele?.type]);
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
};

export function CustomAnnotationTextEditor({
  instanceId,
  className,
  style,
  minHeight = 300,
  initialText,
  initialHTML,
  placeholderHTML = '<p style="text-align: left;">Hello World!</p>',
  readOnly = false,
  priorityKey = "simple_rich_editor_toolbar_priority",
  defaultPriority = DEFAULT_TOOLBAR_PRIORITY,
  onChange,
  onAIHighlight,
  showMoreOptions = true,
  headingControls = false,
  id = "editor",
  showPreview,
  setShowPreview,
}) {
  // ----- ids & storage
  const _instanceId = useRef(
    instanceId || `sre_${Math.random().toString(36).slice(2)}`
  ).current;
  const storage = {
    get(k) {
      try {
        return JSON.parse(window.localStorage.getItem(k) || "null");
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        window.localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    },
  };

  // ----- editor dom & state
  const editorRef = useRef(null);
  const editorObjRef = useRef(null);
  const canonicalHTMLRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(globalThis.RecordingValue || null);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [isCommandBox, setIsCommandBox] = useState(false);

  const [isTagSuggestionsOpen, setIsTagSuggestionsOpen] = useState(false);
  const [isPlaylistSuggestionOpen, setIsPlaylistSuggestionOpen] =
    useState(false);

  const TAG_OPTIONS = useMemo(
    () => [
      ...(globalThis?.UsedTags || []).map((tag) => ({
        key: tag.label,
        label: tag.label,
      })),
    ],
    [globalThis?.UsedTags]
  );

  const PLAYLIST_OPTIONS = useMemo(
    () => [
      ...(globalThis?.[`defaultplaylists`] || []).map((playlist: any) => ({
        key: playlist.id,
        label: playlist.name,
        metaData: playlist,
      })),
    ],
    []
  );

  const onClickTags = (tag: any) => {
    const tagHTML = `<span id=${showPreview ? "hashtag" : ""}>${tag.label}</span><br/>`;
    if (!editorObjRef.current) return;
    const { from } = editorObjRef.current.state.selection;
    // Replace the last typed "#" with "#tag"
    editorObjRef.current
      .chain()
      .focus()
      .insertContentAt({ from: from - 1, to: from }, `${tagHTML} `)
      .run();

    setIsTagSuggestionsOpen(false);
  };

  const [savingPlaylist, setSavingPlaylist] = useState(false);

  const createPlaylistLink = async (playlist: any) => {
    globalThis.LatestPlaylistID = null;

    setSavingPlaylist(true);
    let shareProfileName = "Guest";
    let shareProfilePic = defaultProfile;
    const authBot = await os.requestAuthBotInBackground();
    if (authBot?.id) {
      const data = await os.getData(
        thisBot.tags.keyFetchAccountData,
        authBot.id
      );
      if (data.success) {
        const payload = data.data;
        shareProfileName = payload.profileName || "Guest";
        shareProfilePic = payload.photoLink || defaultProfile;
      }
    }

    const playlistObj = {
      ...playlist,
      shareProfileName,
      shareProfilePic,
      sharerID: authBot?.id || "N/A",
    };

    const id = globalThis.createUUID();

    const result = await os.recordData(
      authBot.id,
      `${playlistObj.id}-${id}`,
      playlistObj,
      {
        marker: "publicRead",
      }
    );

    const recordShareKey = `${authBot.id}^_^${playlistObj.id}-${id}`;

    if (result.success) {
      globalThis.LatestPlaylistID = recordShareKey;
      setSavingPlaylist(false);
    } else {
      globalThis.LatestPlaylistID = null;
      ShowNotification({
        message: t("unableToCopy"),
        severity: "error",
      });
      setSavingPlaylist(false);
    }

    setLoading(false);
    return recordShareKey;
  };

  const onClickPlaylist = async (playlist: any) => {
    const playlistFind = PLAYLIST_OPTIONS.find(
      (playlistItr: any) => playlistItr.key === playlist.key
    );
    if (!globalThis.PlaylistReferLinks) {
      globalThis.PlaylistReferLinks = {};
    }

    let refId = "";

    if (!globalThis.PlaylistReferLinks) {
      globalThis.PlaylistReferLinks = {};
    }

    if (!globalThis.PlaylistReferLinks[playlistFind.key]) {
      await createPlaylistLink(playlistFind.metaData);
      if (globalThis.LatestPlaylistID) {
        globalThis.PlaylistReferLinks[playlistFind.key] =
          globalThis.LatestPlaylistID;
        refId = globalThis.LatestPlaylistID;
      }
    } else {
      refId = globalThis.PlaylistReferLinks[playlistFind.key];
    }

    if (!refId) return;
    if (!playlistFind) return;
    const playlistID = PlaylistID(playlistFind.metaData.list);
    const playlistHTML = `<span id="${refId}">< [${playlistID}] -----|---- [${playlist.label}]/> </span>`;
    if (!editorObjRef.current) return;

    const { from } = editorObjRef.current.state.selection;

    if (globalThis.ThruCommandBox) {
      editorObjRef.current
        .chain()
        .focus()
        .insertContentAt({ from: from - 1, to: from }, playlistHTML)
        .run();
    } else {
      editorObjRef.current.chain().focus().insertContent(playlistHTML).run();
    }

    globalThis.ThruCommandBox = false;

    setIsPlaylistSuggestionOpen(false);
  };

  const toggleTagSuggestions = () => {
    setIsTagSuggestionsOpen((prev) => !prev);
  };

  const togglePlaylistSuggestions = () => {
    setIsCommandBox(false);
    setIsPlaylistSuggestionOpen((prev) => !prev);
  };

  globalThis.TogglePlaylistSuggestions = togglePlaylistSuggestions;

  const toggleCommandBox = () => {
    setIsCommandBox((prev) => !prev);
  };

  globalThis.ToggleCommandBox = toggleCommandBox;

  const togglePreview = () => {
    setShowPreview((v) => {
      if (!v && editorObjRef.current) {
        editorObjRef.current.commands.setContent(
          ColorizeParagraphs(canonicalHTMLRef.current)
        );
      } else {
        editorObjRef.current.commands.setContent(
          fakeEscapeMediaTags(
            uncolorizeHashtags(editorObjRef.current.getHTML())
          )
        );
      }
      return !v;
    });
  };

  globalThis.TogglePreview = togglePreview;

  useEffect(() => {
    globalThis.RecordingValue = recording;
    globalThis.ShowCommandBox = toggleCommandBox;
    globalThis.SetRecordingData = setData;
    globalThis.SetRecording = setRecording;
    return () => {
      globalThis.SetRecordingData = null;
      globalThis.SetRecording = null;
    };
  }, [recording]);

  const handleDropFiles = async (files) => {
    if (loading) return;
    setLoading(true);
    const data = await uploadFilesReusable(files);
    let html = "";

    data.forEach((file) => {
      const htmlSuffix = appendImageToEditorHTML(file);
      html += fakeEscapeMediaTags(htmlSuffix, showPreview);
    });

    if (html) {
      setTimeout(() => {
        if (!editorObjRef.current) return;
        if (globalThis.ThruCommandBox) {
          globalThis.ThruCommandBox = false;
          const { from } = editorObjRef.current.state.selection;
          editorObjRef.current
            .chain()
            .focus()
            .insertContentAt({ from: from - 1, to: from }, html)
            .run();
          return;
        }
        editorObjRef.current.chain().focus().insertContent(html).run();
      }, 50);
    }

    setLoading(false);
  };

  globalThis.HandleUploadFiles = handleDropFiles;

  const { dragRef, dragState } = useDragRef({ onUploadFiles: handleDropFiles });

  // colors & font size
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [fontPx, setFontPx] = useState(16);
  const [lineSpacing, setLineSpacing] = useState(1.6);

  // padding controls
  const [padY, setPadY] = useState(12);
  const [padX, setPadX] = useState(12);

  // selection scope (all/headings/verses) — keep API parity; “verses/headings” act as all here
  const [scope, setScope] = useState("all");

  // priorities
  const [priority, setPriority] = useState(() => {
    const saved =
      storage.get(`${priorityKey}:${_instanceId}`) || storage.get(priorityKey);
    if (Array.isArray(saved) && saved.length) return saved;
    return defaultPriority;
  });

  // overflow calc
  const toolbarRef = useRef(null);
  const measurerRef = useRef(null);
  const itemsRef = useRef({});
  const [visibleIds, setVisibleIds] = useState([]);
  const [overflowIds, setOverflowIds] = useState([]);
  const [showOverflow, setShowOverflow] = useState(false);

  // tuning modal
  const [showTuning, setShowTuning] = useState(false);
  const [draftOrder, setDraftOrder] = useState(priority);

  // --- priority API per instance
  useEffect(() => {
    window.SimpleEditorToolbar = window.SimpleEditorToolbar || {};
    window.SimpleEditorToolbar[_instanceId] = {
      setPriorities: (ids) => {
        if (!Array.isArray(ids) || !ids.length) return;
        setPriority(ids);
        storage.set(`${priorityKey}:${_instanceId}`, ids);
      },
      getPriorities: () => priority.slice(),
      resetPriorities: () => {
        setPriority(defaultPriority);
        storage.set(`${priorityKey}:${_instanceId}`, defaultPriority);
      },
    };
    // cleanup
    return () => {
      delete window.SimpleEditorToolbar?.[_instanceId];
    };
  }, [priority]);

  const onAddExternalLink = (data) => {
    console.log("data", data);
  };

  const typingDeboncingTimeout = useRef(null);

  // ---- init editor
  useEffect(() => {
    if (!editorRef.current) return;

    const contentHTML = (() => {
      canonicalHTMLRef.current = initialHTML;
      if (typeof initialHTML === "string")
        return fakeEscapeMediaTags(
          uncolorizeHashtags(initialHTML),
          showPreview
        );
      if (typeof initialText === "string")
        return `<p>${escapeHTML(initialText)}</p>`;
      return fakeEscapeMediaTags(
        uncolorizeHashtags(placeholderHTML),
        showPreview
      );
    })();

    const editor = new Editor({
      element: editorRef.current,
      editable: !readOnly,
      extensions: [
        StarterKit.configure({
          heading: true,
          blockquote: true,
          paragraph: { HTMLAttributes: { style: "text-align: left;" } },
        }),
        TextStyle,
        Color.configure({ types: ["textStyle"] }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
          defaultAlignment: "left",
        }),
        Underline,
        Superscript,
        Subscript,
        Highlight.configure({ multicolor: true }),
        BulletList,
        OrderedList,
        Video,
        Iframe,
        ListItem,
        LineHeight,
        Audio,
        CustomImage.configure({ inline: false, allowBase64: true }),
        Link.configure({ openOnClick: true, linkOnPaste: true }),
        CustomSpan,
        CustomDiv,
      ],
      editorProps: {
        handleDOMEvents: {
          keyup: (_, event: any) => {
            if (event.key === "Shift") {
              return true;
            }
            if (event.key === "/") {
              toggleCommandBox();
              return;
            }
            setIsCommandBox(false);
            setIsPlaylistSuggestionOpen(false);
            if (event.key === "#" && TAG_OPTIONS.length > 0) {
              toggleTagSuggestions();
              return;
            }
            setIsTagSuggestionsOpen(false);
            return true;
          },
          // Block keyboard and menu copy/cut
          copy: () => {
            // event.preventDefault();
            return true;
          },
          cut: () => {
            // event.preventDefault();
            return true;
          },
          // (Optional) stop dragging out selections / drags
          dragstart: (_, event) => {
            event.preventDefault();
            return true;
          },
          paste: async (_, event) => {
            const items = event?.clipboardData?.items;

            // 🔴 STOP DEFAULT PASTE IMMEDIATELY
            event.preventDefault();
            event.stopPropagation();

            const plainText = event.clipboardData.getData("text/plain");
            const htmlText = event.clipboardData.getData("text/html");

            // const pastedText = [];
            if (!items || !items.length) return false;
            const files = [];
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) files.push(file);
              }
              // if (item.kind === "string") {
              //   const text = await item.getAsString();
              //   console.log("text", text);
              //   pastedText.push(text);
              // }
            }
            setLoading(true);
            const data = await uploadFilesReusable({
              files,
            });
            setLoading(false);

            let html = "";

            data.forEach((file) => {
              const htmlSuffix = appendImageToEditorHTML(file);
              html += fakeEscapeMediaTags(htmlSuffix, showPreview);
            });

            if (plainText) {
              const embedHTML = fakeEscapeMediaTags(
                generateEmbedFromUrl(plainText.trim()),
                showPreview
              );

              if (embedHTML) {
                setTimeout(() => {
                  editor.chain().focus().insertContent(embedHTML).run();
                }, 50);
              } else if (htmlText) {
                setTimeout(() => {
                  editor.chain().focus().insertContent(htmlText).run();
                }, 50);
              } else {
                setTimeout(() => {
                  editor.chain().focus().insertContent(plainText).run();
                }, 50);
              }
              return true;
            }

            if (html) {
              setTimeout(() => {
                editor.chain().focus().insertContent(html).run();
              }, 50);
              return true;
            }
          },
          drop: async () => {
            return true;
          },
        },
      },
      content: contentHTML,
    });

    editorObjRef.current = editor;

    editor.on("update", () => {
      try {
        // if the editor html ending with '/' then toggle the command box
        const editorHTML = editor.getHTML();

        const html = fakeUnescapeMediaTags(ColorizeParagraphs(editorHTML));
        canonicalHTMLRef.current = html;

        if (onChange) {
          onChange(
            html.replace(/\bclass(name)?\s*=/gi, "class="),
            editor.getJSON()
          );
        }
      } catch {}
    });

    globalThis[`${id}ClearEditorContent`] = () =>
      editor.commands.setContent("");

    // apply initial paddings
    applyPadding(padY, padX);

    return () => {
      editor.destroy();
      editorObjRef.current = null;
    };
  }, []);

  // ---- helpers for marks on whole doc (scope kept for API parity)
  const applyMarkWholeDoc = (markName, attrs = null) => {
    const editor = editorObjRef.current;
    if (!editor) return;
    const { state, view } = editor;
    const { tr, schema, doc } = state;
    const mt = schema.marks[markName];
    if (!mt) return;
    const from = 0;
    const to = doc.content.size;
    tr.addMark(from, to, mt.create(attrs || {}));
    if (tr.docChanged) view.dispatch(tr);
  };

  // ---- toolbar commands (same options)
  const Cmds = {
    video: () => {
      shout("startRecording", RECORDING_TYPES.video);
    },
    mic: () => {
      shout("startRecording", RECORDING_TYPES.audio);
    },
    slash: () => {
      shout("showCommandBox", RECORDING_TYPES.audio);
    },
    bold: () => chain("toggleBold"),
    italic: () => chain("toggleItalic"),
    underline: () => chain("toggleUnderline"),
    strikethrough: () => chain("toggleStrike"),
    superscript: () => chainWith("toggleSuperscript"),
    subscript: () => chainWith("toggleSubscript"),
    alignLeft: () => chainArg("setTextAlign", "left"),
    alignCenter: () => chainArg("setTextAlign", "center"),
    alignRight: () => chainArg("setTextAlign", "right"),
    alignJustify: () => chainArg("setTextAlign", "justify"),
    toggleBulletList: () => chainWith("toggleBulletList"),
    toggleOrderedList: () => chainWith("toggleOrderedList"),
    undo: () => chainWith("undo"),
    redo: () => chainWith("redo"),
    clear: () => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain().focus().clearNodes().unsetAllMarks().run();
    },
    setTextColor: (color) => {
      setTextColor(color);
      const ed = editorObjRef.current;
      if (!ed) return;
      // keep simple whole-doc behavior for parity
      try {
        ed.chain().focus().setColor(color).run();
      } catch {}
    },
    setHighlightColor: (color) => {
      setBgColor(color);
      const ed = editorObjRef.current;
      if (!ed) return;
      try {
        ed.chain().focus().setMark("highlight", { color }).run();
      } catch {}
    },
    setFontFamily: (font) => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain()
        .focus()
        .setMark("textStyle", { style: `font-family:${font};` })
        .run();
    },
    setFontSize: (px) => {
      setFontPx(px);
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain()
        .focus()
        .setMark("textStyle", { style: `font-size:${px}px;` })
        .run();
    },
    setLineHeight: (lh) => {
      setLineSpacing(lh);
      const ed = editorObjRef.current;
      if (!ed) return;
      // mark across the whole doc
      const { state, view } = ed;
      const { tr, schema, doc } = state;
      const mt = schema.marks.lineHeight;
      if (!mt) return;
      tr.addMark(0, doc.content.size, mt.create({ lineHeight: lh }));
      if (tr.docChanged) view.dispatch(tr);
    },
    insertImageDataURL: (dataURL) => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain().focus().setImage({ src: dataURL }).run();
    },
    insertLink: (href) => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain().focus().extendMarkRange("link").setLink({ href }).run();
    },
    removeLink: () => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain().focus().unsetLink().run();
    },
    getHTML: () => editorObjRef.current?.getHTML() || "",
    setHTML: (html) => editorObjRef.current?.commands.setContent(html),
    exportJSON: () => {
      const ed = editorObjRef.current;
      if (!ed) return;
      const data = JSON.stringify(ed.getJSON(), null, 2);
      const blob = new Blob([data], { type: "application/json;charset=utf-8" });
      triggerDownload(blob, "editor-content.json");
    },
    importJSON: (json) => {
      const ed = editorObjRef.current;
      if (!ed) return;
      try {
        const parsed = typeof json === "string" ? JSON.parse(json) : json;
        ed.commands.setContent(parsed);
      } catch (e) {
        alert("Invalid JSON");
      }
    },
    print: () => window.print(),
    aiHighlight: async () => {
      const ed = editorObjRef.current;
      if (!ed) return;
      if (!onAIHighlight) {
        alert("Provide onAIHighlight prop to enable this.");
        return;
      }
      const html = ed.getHTML();
      try {
        const newHTML = await onAIHighlight(html);
        if (newHTML && typeof newHTML === "string") {
          ed.commands.setContent(newHTML);
        }
      } catch (e) {
        console.error(e);
      }
    },
  };

  // chain helpers
  function chain(method) {
    const ed = editorObjRef.current;
    if (!ed) return;
    ed.chain().focus()[method]().run();
  }
  function chainWith(method) {
    const ed = editorObjRef.current;
    if (!ed) return;
    if (typeof ed.chain().focus()[method] === "function")
      ed.chain().focus()[method]().run();
  }
  function chainArg(method, arg) {
    const ed = editorObjRef.current;
    if (!ed) return;
    ed.chain().focus()[method](arg).run();
  }

  // ---- uploads: image & JSON via native inputs
  const fileImgInput = useRef(null);
  const fileJsonInput = useRef(null);
  const fileLinkInput = useRef(null);

  const onPickImage = () => fileImgInput.current?.click();
  const onImageSelected = (e) => {
    handleDropFiles({
      files: Array.from(e.target.files),
    });
  };

  const onPickJSON = () => fileJsonInput.current?.click();
  const onJSONSelected = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => Cmds.importJSON(reader.result);
    reader.readAsText(f, "utf-8");
    e.target.value = "";
  };

  const onAddLink = () => {
    const href = prompt("Enter URL:");
    if (href) Cmds.insertLink(href);
  };

  // ---- responsive overflow compute (auto-size items)
  const computeLayout = () => {
    const toolbarEl = toolbarRef.current;
    const measurerEl = measurerRef.current;
    if (!toolbarEl || !measurerEl) return;

    const ids = orderedIds();
    const toolbarWidth = toolbarEl.clientWidth;
    const overflowBtnWidth = 44;
    const paddingSafety = 8;
    const available = Math.max(
      0,
      toolbarWidth - overflowBtnWidth - paddingSafety
    );

    let used = 0;
    const vis = [];
    const over = [];
    for (const id of ids) {
      const el = itemsRef.current[id];
      if (!el) continue;
      const w = el.offsetWidth + 10;
      if (used + w <= available && (!headingControls || vis.length < 3)) {
        vis.push(id);
        used += w;
      } else {
        over.push(id);
      }
    }

    if (headingControls) {
      ["text-color", "bg-color", "align"].forEach((ele) => {
        vis.push(ele);
      });
    }

    setVisibleIds(vis);
    setOverflowIds(over);
  };

  useEffect(() => {
    const ro = new ResizeObserver(() => computeLayout());
    if (toolbarRef.current) ro.observe(toolbarRef.current);
    const onR = () => computeLayout();
    window.addEventListener("resize", onR);
    const t = setTimeout(computeLayout, 120);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onR);
      clearTimeout(t);
    };
  }, [priority.join("|")]);

  // ---- ordered ids (append missing, ensure tune present)
  const toolbarMap = buildToolbarMap({
    Cmds,
    textColor,
    setTextColor,
    bgColor,
    setBgColor,
    fontPx,
    setFontPx,
    lineSpacing,
    setLineSpacing,
    padY,
    setPadY,
    padX,
    setPadX,
    onPickImage,
    onPickJSON,
    onAddLink,
    onAIHighlight,
  });

  const allIds = Object.keys(toolbarMap);
  function orderedIds() {
    const known = priority.filter((id) => allIds.includes(id));
    const missing = allIds.filter((id) => !known.includes(id));
    // tune last
    const out = [...known, ...missing];
    // ensure tune is last
    const idxTune = out.indexOf("tune");
    if (idxTune !== -1) out.splice(idxTune, 1);
    out.push("tune");
    return out;
  }

  // ---- tuning actions
  const moveDraft = (i, dir) => {
    setDraftOrder((prev) => {
      const arr = prev.slice();
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };
  const saveDraft = () => {
    setPriority(draftOrder);
    storage.set(`${priorityKey}:${_instanceId}`, draftOrder);
    setShowTuning(false);
  };

  // ---- apply paddings to editor container
  function applyPadding(py, px) {
    const el = editorRef.current;
    if (!el) return;
    el.style.paddingTop = `${py}px`;
    el.style.paddingBottom = `${py}px`;
    el.style.paddingLeft = `${px}px`;
    el.style.paddingRight = `${px}px`;
  }

  useEffect(() => {
    applyPadding(padY, padX);
  }, [padY, padX]);

  const isMic = useMemo(() => recording === RECORDING_TYPES.audio, [recording]);
  const isVideo = useMemo(
    () => recording === RECORDING_TYPES.video,
    [recording]
  );
  const isLink = useMemo(() => recording === RECORDING_TYPES.link, [recording]);

  const [data, setData] = useState(null);

  const onSaveAndAdd = async () => {
    if (isLink) {
      if (!link.trim())
        return ShowNotification({
          message: "Please enter a link to save!",
          severity: "error",
        });

      const originalHTML = generateEmbedFromUrl(link.trim(), name.trim());
      const embedHTML = fakeEscapeMediaTags(originalHTML, showPreview);

      if (embedHTML === null) {
        globalThis.ThruCommandBox = false;

        return ShowNotification({
          message: "Invalid link!",
          severity: "error",
        });
      }
      if (globalThis.ThruCommandBox) {
        globalThis.ThruCommandBox = false;
        const { from } = editorObjRef.current.state.selection;
        editorObjRef.current
          .chain()
          .focus()
          .insertContentAt({ from: from - 1, to: from }, embedHTML)
          .run();
      } else {
        editorObjRef.current.chain().focus().insertContent(embedHTML).run();
      }
      setLink("");
      setName("");
      setRecording(null);
      return;
    }

    if (recording === RECORDING_TYPES.audio && !data) {
      globalThis.HandleStopPlayVoice();
      return;
    }

    if (recording === RECORDING_TYPES.video && !data) {
      globalThis.HandleStopPlayVideo();
      return;
    }

    await os.sleep(100);

    if (!data)
      return ShowNotification({
        message: "Please record something to save!",
        severity: "error",
      });

    const finalData =
      recording === RECORDING_TYPES.audio ? globalThis.ORIGINAL_DATA : data;

    if (
      recording === RECORDING_TYPES.audio ||
      recording === RECORDING_TYPES.video
    ) {
      setLoading(true);

      const fileSave = await os.recordFile(
        globalThis?.RECORD_STOREKEY,
        finalData,
        {
          name: `${new Date().toISOString()}.${recording === RECORDING_TYPES.audio ? "webm" : "mp4"}`,
          mimeType: recording,
        }
      );

      const url = fileSave.url || fileSave?.existingFileUrl;

      setLoading(false);

      if (!url) {
        globalThis.ThruCommandBox = false;
        return ShowNotification({
          message: "Failed to upload File!",
          severity: "error",
        });
      }
      let htmlToInsert;
      if (isVideo) {
        htmlToInsert = `
        <video
          src="${url}"
          controls
          height="100%"
          style="max-width: 100%;"
        ></video>
        `;
      } else {
        htmlToInsert = `
        <audio controls src="${url}" type="audio/webm">
        </audio>
        `;
      }

      htmlToInsert = fakeEscapeMediaTags(htmlToInsert, showPreview);

      if (globalThis.ThruCommandBox) {
        globalThis.ThruCommandBox = false;
        const { from } = editorObjRef.current.state.selection;
        editorObjRef.current
          .chain()
          .focus()
          .insertContentAt({ from: from - 1, to: from }, htmlToInsert)
          .run();
      } else {
        editorObjRef.current.chain().focus().insertContent(htmlToInsert).run();
      }

      setRecording(null);
      setData(null);
    }
  };

  return (
    <>
      {isCommandBox && (
        <div
          className="command-box-backdrop"
          onClick={toggleCommandBox}
          style={{
            display: isCommandBox ? "block" : "none",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 98,
          }}
        ></div>
      )}
      <div
        ref={dragRef}
        className={`sre-root ${isVideo ? "sre-video-root" : ""} ${className || ""}`}
        style={{ ...style }}
      >
        {isCommandBox && (
          <div
            className="relative-float command-box"
            style={{
              backgroundColor: "var(--pageBackground)",
              backdropFilter: "none",
            }}
          >
            {COMMAND_BOX_OPTIONS.map((option) => (
              <div
                className="command-box-option"
                key={option.label}
                onClick={option.onClick}
              >
                <img
                  className="img-icon"
                  src={option.icon}
                  alt={option.label}
                />
                <p>{option.label}</p>
              </div>
            ))}
          </div>
        )}

        {isTagSuggestionsOpen && (
          <SelectionOptions
            handleClose={() => setIsTagSuggestionsOpen(false)}
            options={TAG_OPTIONS}
            onClickOption={onClickTags}
          />
        )}
        {isPlaylistSuggestionOpen && (
          <SelectionOptions
            loading={savingPlaylist}
            isPlaylist
            dontCloseOnClick
            handleClose={() => setIsPlaylistSuggestionOpen(false)}
            options={PLAYLIST_OPTIONS}
            onClickOption={onClickPlaylist}
          />
        )}

        {(isMic || isLink || isVideo) && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "-4%",
              right: 0,
              bottom: 0,
              backgroundColor: "var(--pageBackground)",
              zIndex: 10000,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              width: "107%",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(2px)",
              minHeight: "max-content",
              height: "calc(100% + 90px)",
              padding: "1rem 0",
            }}
          >
            {isLink ? (
              <div
                className="input-conainter-type"
                style={{
                  padding: "1px 0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Input
                  style={{ width: "100%" }}
                  value={name}
                  onChangeListener={setName}
                  placeholder={t("typeToAddCustomTitle")}
                />
                <div style={{ width: "100%", display: "flex", gap: "1rem" }}>
                  <Input
                    style={{ marginBottom: "0", flexGrow: "1" }}
                    value={link}
                    onChangeListener={setLink}
                    placeholder={`${t("exampleeg")} https://www.youtube.com/watch?v=ALsluAKBZ-czs3`}
                  />
                </div>
              </div>
            ) : isVideo ? (
              <VideoRecordUI data={data} setData={setData} />
            ) : (
              <RecordingUI data={data} setData={setData} />
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <Button onClick={onSaveAndAdd} secondary loading={loading}>
                Save & Add
              </Button>
              <Button
                onClick={() => {
                  setRecording(null);
                }}
                secondaryAlt
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {(dragState.isDragOver || loading) && !isMic && !isVideo && (
          <div
            className="relative-float"
            style={{
              top: "3rem",
            }}
          >
            <div
              style={{
                display: "grid",
                width: "100%",
                backgroundColor: "white",
                padding: "4px",
                borderRadius: "12px",
                border: "3px dashed var(--spaceSelection)",
                textAlign: "center",
                minWidth: "280px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                zIndex: 99999,
              }}
            >
              {loading ? (
                <div
                  style={{
                    color: "#333",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                  }}
                >
                  <div className="sre-loading-spinner"></div>
                  <p>Uploading files...</p>
                  <p>Please wait while we upload the files...</p>
                  <p>This may take a few seconds...</p>
                  <p>Thank you for your patience...</p>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      fontSize: "1rem",
                      color: "var(--spaceSelection)",
                    }}
                  >
                    📁
                  </div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      color: "#333",
                      fontSize: "14px",
                    }}
                  >
                    Drop files here
                  </h3>
                  <p
                    style={{
                      margin: "0",
                      color: "#666",
                      fontSize: "12px",
                    }}
                  >
                    Release to upload files
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <style>{SRE_STYLES(minHeight)}</style>

        <input
          ref={fileImgInput}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onImageSelected}
        />
        <input
          ref={fileJsonInput}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={onJSONSelected}
        />

        <div className="sre-toolbar" ref={toolbarRef}>
          <div className="sre-measurer" ref={measurerRef}>
            {orderedIds().map((id) => (
              <div
                key={`m-${id}`}
                ref={(el) => (itemsRef.current[id] = el)}
                className="sre-item-measurer"
              >
                {toolbarMap[id]}
              </div>
            ))}
          </div>

          {visibleIds.map((id) => (
            <div key={`v-${id}`} className="sre-item">
              {toolbarMap[id]}
            </div>
          ))}

          {showMoreOptions && (
            <div className="sre-item">
              <button
                className="sre-overflow-btn"
                onClick={() => setShowOverflow((v) => !v)}
                title="More"
              >
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          )}
        </div>

        {showOverflow && (
          <div className="sre-overflow-tray">
            {overflowIds.length === 0 && (
              <div className="sre-overflow-empty">No more items</div>
            )}
            {overflowIds.map((id) => (
              <div key={`o-${id}`} className="sre-overflow-item">
                {toolbarMap[id]}
              </div>
            ))}
          </div>
        )}

        <div
          id={`sre-editor-${_instanceId}`}
          ref={editorRef}
          className="sre-editor"
        />
        {false && (
          <p className="sre-hashtag-hint">
            You can add tags by typing # followed by the hashtag. For example,
            #love #faith #hope.
          </p>
        )}
        {showTuning && (
          <div
            className="sre-tune-backdrop"
            onClick={() => setShowTuning(false)}
          >
            <div
              className="sre-tune-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sre-tune-header">
                <div>Customize toolbar order</div>
                <button
                  className="sre-tune-close"
                  onClick={() => setShowTuning(false)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="sre-tune-body">
                {draftOrder.map((id, idx) => (
                  <div key={`dr-${id}`} className="sre-tune-row">
                    <div className="sre-tune-id">{id}</div>
                    <div className="sre-tune-arrows">
                      <button onClick={() => moveDraft(idx, -1)} title="Up">
                        <span className="material-symbols-outlined">
                          keyboard_arrow_up
                        </span>
                      </button>
                      <button onClick={() => moveDraft(idx, 1)} title="Down">
                        <span className="material-symbols-outlined">
                          keyboard_arrow_down
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sre-tune-footer">
                <button
                  className="sre-btn-secondary"
                  onClick={() => setDraftOrder(defaultPriority)}
                >
                  Reset
                </button>
                <div style={{ flex: 1 }} />
                <button className="sre-btn-primary" onClick={saveDraft}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // -------------- build toolbar map (JSX per id) ---------------
  function buildToolbarMap(ctx) {
    const {
      Cmds,
      textColor,
      setTextColor,
      bgColor,
      setBgColor,
      fontPx,
      setFontPx,
      lineSpacing,
      setLineSpacing,
      padY,
      setPadY,
      padX,
      setPadX,
      onPickImage,
      onPickJSON,
      onAddLink,
    } = ctx;

    const iconBtn = (
      title,
      icon,
      onClick,
      url = "",
      isInverse = false,
      marginNegative = false
    ) => (
      <button
        className={`sre-ib ${isInverse ? "sre-ib-inverse" : ""} ${marginNegative ? "margin-negative-sre" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          onClick(e);
        }}
        title={title}
      >
        {url ? (
          <img width={14} height={14} src={url} alt={title} />
        ) : (
          <span className="material-symbols-outlined">{icon}</span>
        )}
      </button>
    );

    const colorInput = (value, onChange) => (
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sre-color"
      />
    );

    const numberChip = (value, setValue, min, max, step, onApply) => (
      <div className="sre-numchip">
        <button
          onClick={(e) => {
            e.preventDefault();
            const v = clamp((+value || 0) - step, min, max);
            setValue(v);
            onApply(v);
          }}
        >
          −
        </button>
        <div>{value}</div>
        <button
          onClick={(e) => {
            e.preventDefault();
            const v = clamp((+value || 0) + step, min, max);
            setValue(v);
            onApply(v);
          }}
        >
          +
        </button>
      </div>
    );

    const select = (options, value, onChange, title) => (
      <select
        className="sre-select"
        value={value}
        title={title}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );

    const alignDrop = (
      <div className="sre-drop">
        <button
          className="sre-ib"
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          <span className="material-symbols-outlined">format_align_left</span>
        </button>
        <div className="sre-drop-menu">
          <button
            onClick={(e) => {
              e.preventDefault();
              Cmds.alignLeft(e);
            }}
          >
            <span className="material-symbols-outlined">format_align_left</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              Cmds.alignCenter(e);
            }}
          >
            <span className="material-symbols-outlined">
              format_align_center
            </span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              Cmds.alignRight(e);
            }}
          >
            <span className="material-symbols-outlined">
              format_align_right
            </span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              Cmds.alignJustify(e);
            }}
          >
            <span className="material-symbols-outlined">
              format_align_justify
            </span>
          </button>
        </div>
      </div>
    );

    const listDrop = (
      <div className="sre-drop">
        <button className="sre-ib">
          <span className="material-symbols-outlined">
            format_list_bulleted
          </span>
        </button>
        <div className="sre-drop-menu">
          <button
            onClick={(e) => {
              e.preventDefault();
              Cmds.toggleBulletList(e);
            }}
          >
            <span className="material-symbols-outlined">
              format_list_bulleted
            </span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              Cmds.toggleOrderedList(e);
            }}
          >
            <span className="material-symbols-outlined">
              format_list_numbered
            </span>
          </button>
        </div>
      </div>
    );

    const paragraphDrop = (
      <select className="sre-select" title="Paragraph">
        <option
          onClick={(e) => {
            e.preventDefault();
            chain("setParagraph");
          }}
        >
          P
        </option>
        <option
          onClick={(e) => {
            e.preventDefault();
            chainArg("toggleHeading", { level: 1 });
          }}
        >
          H1
        </option>
        <option
          onClick={(e) => {
            e.preventDefault();
            chainArg("toggleHeading", { level: 2 });
          }}
        >
          H2
        </option>
        <option
          onClick={(e) => {
            e.preventDefault();
            chainArg("toggleHeading", { level: 3 });
          }}
        >
          H3
        </option>
      </select>
    );

    return {
      mic: iconBtn("Mic", "mic", Cmds.mic),
      video: iconBtn("Video", "video_camera_back_add", Cmds.video),
      slash: iconBtn("Command", null, Cmds.slash, COMMAND_ICON, true, true),
      bold: iconBtn("Bold", "format_bold", Cmds.bold),
      italic: iconBtn("Italic", "format_italic", Cmds.italic),
      underline: iconBtn("Underline", "format_underlined", Cmds.underline),
      strikethrough: iconBtn(
        "Strikethrough",
        "format_strikethrough",
        Cmds.strikethrough
      ),
      superscript: iconBtn("Superscript", "superscript", Cmds.superscript),
      subscript: iconBtn("Subscript", "subscript", Cmds.subscript),
      align: alignDrop,
      list: listDrop,
      "line-spacing": (
        <div className="sre-inline">
          <span className="material-symbols-outlined">format_line_spacing</span>
          <input
            className="sre-number"
            type="number"
            step="0.1"
            min="1"
            max="4"
            value={lineSpacing}
            onChange={(e) => {
              const v = clamp(parseFloat(e.target.value || "1.6"), 1, 4);
              setLineSpacing(v);
              Cmds.setLineHeight(v);
            }}
            title="Line spacing"
          />
        </div>
      ),
      "text-color": (
        <div className="sre-inline" title="Text color">
          <span className="material-symbols-outlined">title</span>
          {colorInput(textColor, (c) => Cmds.setTextColor(c))}
        </div>
      ),
      "bg-color": (
        <div className="sre-inline" title="Highlight color">
          <span className="material-symbols-outlined">border_color</span>
          {colorInput(bgColor, (c) => Cmds.setHighlightColor(c))}
        </div>
      ),
      paragraph: paragraphDrop,
      "font-family": (
        <select
          className="sre-select"
          title="Font family"
          onChange={(e) => Cmds.setFontFamily(e.target.value)}
        >
          {[
            "DM Sans",
            "Arial",
            "Times New Roman",
            "Courier New",
            "Georgia",
            "Verdana",
          ].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      ),
      "font-style": (
        <select
          className="sre-select"
          title="Font style"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "bold") Cmds.bold();
            else if (v === "italic") Cmds.italic();
            else if (v === "light") Cmds.setFontFamily(""); // simple; devs can expand
          }}
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
          <option value="italic">Italic</option>
          <option value="light">Light</option>
        </select>
      ),
      "font-size": (
        <div className="sre-inline" title="Font size">
          <span className="material-symbols-outlined">format_size</span>
          <input
            className="sre-number"
            type="number"
            min="8"
            max="72"
            step="1"
            value={fontPx}
            onChange={(e) => {
              const v = clamp(parseInt(e.target.value || "16", 10), 8, 72);
              setFontPx(v);
              Cmds.setFontSize(v);
            }}
          />
        </div>
      ),
      undo: iconBtn("Undo", "undo", Cmds.undo),
      redo: iconBtn("Redo", "redo", Cmds.redo),
      clear: iconBtn("Clear", "format_clear", Cmds.clear),
      print: iconBtn("Print", "print", Cmds.print),
      "margins-y": (
        <div className="sre-inline" title="Vertical padding">
          <span className="material-symbols-outlined">height</span>
          <input
            className="sre-number"
            type="number"
            min="0"
            max="200"
            value={padY}
            onChange={(e) => {
              const v = clamp(parseInt(e.target.value || "0", 10), 0, 200);
              setPadY(v);
            }}
          />
        </div>
      ),
      "margins-x": (
        <div className="sre-inline" title="Horizontal padding">
          <span className="material-symbols-outlined">width</span>
          <input
            className="sre-number"
            type="number"
            min="0"
            max="200"
            value={padX}
            onChange={(e) => {
              const v = clamp(parseInt(e.target.value || "0", 10), 0, 200);
              setPadX(v);
            }}
          />
        </div>
      ),
      link: iconBtn("Insert Link", "link", onAddLink),
      image: iconBtn("Insert Image", "image", onPickImage),
      download: iconBtn("Download JSON", "file_download", Cmds.exportJSON),
      upload: iconBtn("Upload JSON", "upload_file", onPickJSON),
      ai: iconBtn("AI Highlight", "auto_fix_high", Cmds.aiHighlight),
      tune: (
        <button
          className="sre-ib"
          onClick={() => {
            setDraftOrder(orderedIds().filter((id) => id !== "tune"));
            setShowTuning(true);
          }}
          title="Customize toolbar"
        >
          <span className="material-symbols-outlined">tune</span>
        </button>
      ),
    };
  }
}

// ---------------- styles ----------------
const SRE_STYLES = (minH) => `
.sre-root { width: 100%; position: relative; }
.sre-video-root {
  min-height: 500px;
}
.sre-hashtag-hint {
    font-size: 14px;
    background: #ededed;
    padding: 8px 6px;
    border-radius: 8px;
    margin: 8px 0;
    color: #570000;
}

.sre-preview-btn {
  border: none;
  outline: none;
  cursor: pointer;
  background: transparent;
  border-bottom: 2px solid transparent;
}
.sre-preview-btn.active {
  border-bottom: 2px solid #D36433;
}

.sre-editor {
  min-height: ${minH}px;
  outline: none;
  line-height: 1.6;
  font-size: 16px;
  background: #fff;
  border: 1px solid #e6e6e6;
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.sre-editor * {
  color: initial !important;
}
  .sre-loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--spaceSelection);
    border-top: 2px solid #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
.sre-toolbar {
  width: 100%;
  background: var(--themeSideMenu, #f7f7f9);
  display: flex; align-items: center; justify-content: flex-start;
  padding: 8px 10px; gap: 12px; position: relative; overflow: visible; flex-wrap: nowrap;
  border: 1px solid #e6e6e6; border-bottom: none; border-radius: 8px 8px 0 0;
}
.sre-ib {
  background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 6px;
}
.sre-ib:hover { background: rgba(0,0,0,0.06); }
.sre-inline { display: inline-flex; align-items: center; gap: 6px; padding: 2px 4px; }
.sre-color { width: 26px; height: 26px; border: none; border-radius: 50%; padding: 0; }
.sre-select { height: 30px; border: 1px solid #ccc; border-radius: 6px; background: #fff; font-size: 12px; padding: 0 6px; }
.sre-number { width: 64px; height: 28px; border: 1px solid #ccc; border-radius: 6px; padding: 0 6px; }
.sre-drop { position: relative; }
.sre-drop-menu {
  display: none; position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid #ddd;
  border-radius: 8px; padding: 6px; box-shadow: 0 6px 20px rgba(0,0,0,0.12); z-index: 10;
}
.sre-drop:hover .sre-drop-menu {  width: max-content; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.sre-measurer {
  position: absolute; left: -9999px; top: 0; visibility: hidden;
  display: flex; gap: 12px; align-items: center; height: 0; padding: 0;
}
.sre-item-measurer { display: inline-flex; align-items: center; }
.sre-item { display: inline-flex; align-items: center; flex-shrink: 0; }

.sre-overflow-btn { background: transparent; border: none; cursor: pointer; border-radius: 6px; padding: 6px; }
.sre-overflow-btn:hover { background: rgba(0,0,0,0.06); }

/* Auto-width overflow tray */
.sre-overflow-tray {
  width: 100%;
  display: flex;           /* FLEX for auto width */
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #eee;
  border-top: none;
  background: #fafafa;
  border-radius: 0 0 8px 8px;
  margin-top: -8px;        /* tuck under toolbar edge slightly */
}
.sre-overflow-item {
  display: inline-flex; align-items: center; justify-content: flex-start;
  padding: 4px 6px; background: #fff; border: 1px solid #eaeaea; border-radius: 6px;
  white-space: nowrap;
}
.sre-overflow-empty { color: #777; font-size: 12px; padding: 6px 2px; }

/* tuning modal */
.sre-tune-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.sre-tune-modal {
  width: min(720px, 90vw); max-height: 80vh; overflow: hidden; background: #fff; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: flex; flex-direction: column;
}
.sre-tune-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #eee; font-weight: 600; }
.sre-tune-close { margin-left: auto; border: none; background: transparent; cursor: pointer; }
.sre-tune-body { padding: 10px 16px; overflow: auto; max-height: 60vh; }
.sre-tune-row { display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 8px; }
.sre-tune-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px; color: #444; background: #f7f7f7; padding: 4px 6px; border-radius: 6px;
}
.sre-tune-arrows button { border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 6px; padding: 2px 4px; margin-left: 4px; }
.sre-tune-footer { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-top: 1px solid #eee; }
.sre-btn-primary { background: #1f6feb; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
.sre-btn-secondary { background: #efefef; color: #333; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }

@media (max-width: 768px) {
  .sre-toolbar { gap: 8px; padding: 6px 8px; }
  .sre-number { width: 56px; }
}
@media (max-width: 480px) {
  .sre-number { width: 50px; }
}

.ProseMirror {
  min-height: 100px;
  outline: none;
  caret-color: black;
}
.ProseMirror:focus {
  outline: none;
}
.sre-image {
  max-width: 100%;
  height: auto;
}

.relative-float {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    backgroundColor: rgba(0, 0, 0, 0.5);
    zIndex: 10000;
    display: flex;
    alignItems: center;
    justifyContent: center;
    backdropFilter: blur(2px);
}

.command-box.relative-float {
    background-color: rgb(247, 247, 247);
    backdrop-filter: none;
    display: flex;
    flex-direction: column;
    top: 4rem;
    left: 2rem;
    height: max-content;
    width: 10rem;
    z-index: 99;
    padding: 10px;
    border-radius: 10px;
    box-shadow: 0px 1px 4px 0px #0000001A;
}
.command-box-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  cursor: pointer;
  font-family: DM Sans;
  font-weight: 500;
  font-style: Medium;
  font-size: 12px;
  leading-trim: NONE;
  line-height: 100%;
  letter-spacing: 0%;
}


.command-box-option img {
  width: 16px;
  cursor: pointer;
  height: 16px;
}

.playlist-wrapper-sre {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e2e2;
  background-color: var(--pageBackground);
  width: max-content;
  border-radius: 1rem;
}  

.playlist-container-sre {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}

span.playlist-icon-sre {
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: var(--themeSideMenu);
  color: var(--pageTextColor) !important;
  font-size: 12px;
  text-transform: uppercase;
}

span.playlist-label-sre {
  font-family: DM Sans;
  font-weight: 500;
  font-style: Medium;
  font-size: 12px;
  line-height: 100%;
  letter-spacing: 0%;
  color: var(--pageTextColor) !important;
}

.sre-ib-inverse {
    filter: var(--filter-mode);
}

.margin-negative-sre {
  margin-top: -7px;
}

.sre-play-circle {
  color: var(--primaryColor) !important;
  font-size: 1.5rem;
}
  

`;

// ---------------- utils ----------------
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function escapeHTML(s) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
}

const MEDIA_OPEN_TAG_REGEX = /<(img|video|audio|iframe)\b[\s\S]*?>/gi;

const MEDIA_CLOSE_TAG_REGEX = /<\/(video|audio|iframe)\s*>/gi;

const PLAYLIST_BLOCK_REGEX =
  /<div\s+(?:class|classname)="playlist-wrapper-sre"[^>]*>\s*<div[^>]*id="([^"]+)"[^>]*(?:class|classname)="playlist-container-sre"[^>]*>[\s\S]*?<span[^>]*(?:class|classname)="playlist-icon-sre"[^>]*>\s*([^<]+)\s*<\/span>[\s\S]*?<span[^>]*(?:class|classname)="playlist-label-sre"[^>]*>\s*([^<]+)\s*<\/span>[\s\S]*?<\/div>\s*<\/div>/gi;

function escapePlaylistBlocks(html) {
  return html.replace(PLAYLIST_BLOCK_REGEX, (_, id, icon, label) => {
    return `
  <p>
    <span id="${id}">
      &lt; [${icon}] -----|---- [${label}]/&gt;
    </span>
  </p>
  `.trim();
  });
}

function fakeEscapeMediaTags(html = "", showPreview = false) {
  if (showPreview) return html;
  html = escapePlaylistBlocks(html);

  return (
    html
      // escape opening media tags
      .replace(MEDIA_OPEN_TAG_REGEX, (tag) =>
        tag.replace(/</g, "‹").replace(/>/g, "›")
      )
      // escape closing media tags
      .replace(MEDIA_CLOSE_TAG_REGEX, (tag) =>
        tag.replace(/</g, "‹").replace(/>/g, "›")
      )
  );
}

const P_BLOCK_REGEX = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

// matches:
// ‹img ... /›
// ‹video ... ›‹/video›
// ‹audio ... ›‹/audio›
// ‹iframe ... ›‹/iframe›
const FAKE_MEDIA_BLOCK_REGEX =
  /‹(img|video|audio|iframe)\b([\s\S]*?)\/?›(?:\s*‹\/\1›)?/gi;

const SELECTION_MARKER_REGEX =
  /<p[^>]*>\s*<span[^>]*id="([^"]+)"[^>]*>\s*&lt;\s*\[(\w+)\][\s-]*\|\s*[\s-]*\[(\w+)\]\s*\/&gt;\s*<\/span>[\s\S]*?<\/p>/gi;

function replaceSelectionMarkers(html) {
  return html.replace(SELECTION_MARKER_REGEX, (_, id, icon, label) => {
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
  });
}

function fakeUnescapeMediaTags(html) {
  html = replaceSelectionMarkers(html);

  return html.replace(P_BLOCK_REGEX, (fullP, inner) => {
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

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { CustomAnnotationTextEditor };
