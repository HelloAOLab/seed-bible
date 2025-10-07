const { useEffect, useState, useRef } = os.appHooks;

import {
  Editor,
  StarterKit,
  preactRenderToString as render,
  TextStyle,
  Color,
  Node,
  TextAlign,
  Underline,
  Superscript,
  Subscript,
  Highlight,
  Mark,
  Image,
  Link,
  BulletList,
  OrderedList,
  ListItem,
} from "https://esm.helloao.org/vendor-RPNXNWQB.js";

import { MarginYIcon, MarginXIcon } from "app.components.icons";
const localStorage = getBot("system", "app.localStorage");

// >>> priorities: dev default order (first = highest priority)
if (!globalThis.DEFAULT_TOOLBAR_PRIORITY)
  globalThis.DEFAULT_TOOLBAR_PRIORITY = [
    "text-select",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "superscript",
    "subscript",
    "align",
    "list",
    "line-spacing",
    "attach",
    "image",
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
    "margin1",
    "margin2",
    "ai-prompt",
    "download",
    "upload",
  ];
// key in your existing storage bucket
const PRIORITY_KEY = "tiptap_toolbar_priorities";

// ------- uploads -------
async function uploadAttachmentAndInsert() {
  const files = await os.showUploadFiles();
  if (files.length === 0) return;
  const file = files[0];
  const fileUrl = await uploadToServerOrBase64(file);
  const fileName = file.name || "download";
  if (globalThis.EditorFns?.insertAttachment && fileUrl) {
    globalThis.EditorFns.insertAttachment(fileName, fileUrl);
  }
}
async function uploadImageAndInsert() {
  const files = await os.showUploadFiles({ accept: "image/*" });
  if (files.length === 0) return;
  const file = files[0];
  const imageUrl = await uploadToServerOrBase64(file);
  if (globalThis.EditorFns?.insertImage && imageUrl) {
    globalThis.EditorFns.insertImage(imageUrl);
  }
}
async function uploadToServerOrBase64(file) {
  return `data:${file.mimeType};base64,${bytes.toBase64String(file.data)}`;
}
async function uploadFile() {
  const files = await os.showUploadFiles();
  if (files.length <= 0) return;
  const file = files[0];
  globalThis.EditorFns.importJson(file.data);
}

// ------- marks/nodes -------
const LineHeight = Mark.create({
  name: "lineHeight",
  addAttributes() {
    return {
      lineHeight: {
        default: null,
        parseHTML: (element) => element.style.lineHeight || null,
        renderHTML: (attributes) => {
          if (!attributes.lineHeight) return {};
          return { style: `line-height: ${attributes.lineHeight}` };
        },
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

const CustomStyle = Mark.create({
  name: "customStyle",
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) =>
          attributes.style ? { style: attributes.style } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[style]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

export const BookTitle = Node.create({
  name: "bookTitle",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "div.bookTitle" }];
  },
  renderHTML() {
    return ["div", { class: "bookTitle" }, 0];
  },
});
export const SectionTitle = Node.create({
  name: "sectionTitle",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "div.sectionTitle" }];
  },
  renderHTML() {
    return ["div", { class: "sectionTitle" }, 0];
  },
});
export const SectionCover = Node.create({
  name: "sectionCover",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "div.sectionCover" }];
  },
  renderHTML() {
    return ["div", { class: "sectionCover" }, 0];
  },
});
export const SectionText = Node.create({
  name: "sectionText",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "div.sectionText" }];
  },
  renderHTML() {
    return ["div", { class: "sectionText" }, 0];
  },
});
export const SectionTextNumber = Node.create({
  name: "sectionTextNumber",
  group: "inline",
  inline: true,
  content: "text*",
  parseHTML() {
    return [{ tag: "span.sectionTextNumber" }];
  },
  renderHTML() {
    return ["span", { class: "sectionTextNumber" }, 0];
  },
});

// ------- render helpers -------
function renderStudyNotesToHTML(studyNote) {
  if (!studyNote || !studyNote.length || !studyNote[0]) {
    return `
      <div class="judeTextPage">
        <div class="verseText">No study note available.</div>
      </div>`;
  }
  let html = `<div class="judeTextPage">`;
  studyNote.forEach((book) => {
    html += `<div class="studyTextContainer">`;
    html += `<h2 class="mainHeader">${book.header}</h2>`;
    book.sections.forEach((verse) => {
      html += `<div class="verse">`;
      const sec = verse.section.toString();
      const m = sec.match(/(\d+):(\d+)(?:\s+(.*))?/);
      if (m) {
        const bookNum = m[1];
        const verseNum = m[2];
        const tail = m[3] || "";
        html += `<h3 class="verseNumber">${bookNum}:${verseNum}${
          tail ? ` <span>${tail}</span>` : ""
        }</h3>`;
      } else {
        html += `<h3 class="verseNumber">${sec}</h3>`;
      }
      verse.content.forEach((line) => {
        html += `<span class="verseText">${line}</span>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}
function generateHtmlFromContent(data) {
  if (!data || !data?.content) return "";
  const bookTitle = `${data?.book} - ${data?.chapter}`;
  const sectionsHtml = data?.content
    .map((section) => {
      const versesHtml = section.verses
        .map((verse) => {
          return `
        <span class="sectionText">
          <span class="sectionTextNumber">${verse.verseNumber}</span>
          ${verse.text}
        </span>`;
        })
        .join("\n");
      return `
      <div class="section">
        <div class="sectionTitle">${section.heading}</div>
        <div class="sectionCover">
          ${versesHtml}
        </div>
      </div>`;
    })
    .join("\n");
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head><meta charset="UTF-8"><title>${bookTitle}</title></head>
      <body>
        <div class="bookTitle">${bookTitle}</div>
        ${sectionsHtml}
      </body>
    </html>`;
}
function segmentHtmlBySectionEnd(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const segments = [];
  let currentSegmentNodes = [];
  const bodyChildren = Array.from(doc.body.childNodes);
  for (const node of bodyChildren) {
    currentSegmentNodes.push(node);
    if (
      node.nodeType === 1 &&
      node.tagName.toLowerCase() === "div" &&
      node.classList.contains("sectionCover")
    ) {
      const tempDoc = document.implementation.createHTMLDocument();
      currentSegmentNodes.forEach((n) =>
        tempDoc.body.appendChild(n.cloneNode(true))
      );
      segments.push(tempDoc.body.innerHTML);
      currentSegmentNodes = [];
    }
  }
  if (currentSegmentNodes.length > 0) {
    const tempDoc = document.implementation.createHTMLDocument();
    currentSegmentNodes.forEach((n) =>
      tempDoc.body.appendChild(n.cloneNode(true))
    );
    segments.push(tempDoc.body.innerHTML);
  }
  return segments;
}

// ------- editor -------
const TextEditor = ({
  content,
  tab,
  data,
  setEnableEditor,
  enableEditor,
  studyNotes,
}) => {
  if (!tab && !studyNotes) return content;

  const editorRef = useRef(null);
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [paddingY, setPaddingY] = useState(0);
  const [paddingX, setPaddingX] = useState(0);

  const htmlString = !studyNotes
    ? generateHtmlFromContent(data)
    : renderStudyNotesToHTML(data);

  useEffect(() => {
    const saveData = (editor) => {
      const key = `${data?.translation}_${data?.book}_${data?.chapter}`;
      const json = editor.getJSON();
      localStorage.masks[key] = { key, data: JSON.stringify(json) };
      os.log("data saved", key, localStorage.masks[key]);
    };

    const editor = new Editor({
      element: document.getElementById("tiptapEditor"),
      onUpdate({ editor }) {
        saveData(editor);
      },
      extensions: [
        StarterKit.configure({
          heading: true,
          blockquote: true,
          paragraph: true,
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
        CustomStyle,
        Subscript,
        BookTitle,
        SectionTitle,
        SectionCover,
        SectionText,
        BulletList,
        OrderedList,
        ListItem,
        SectionTextNumber,
        LineHeight,
        Image.configure({ inline: false, allowBase64: true }),
        Link.configure({ openOnClick: true, linkOnPaste: true }),
        Highlight.configure({ multicolor: true }),
      ],
      content: htmlString || '<p style="text-align: left;">Hello World!</p>',
    });

    editorRef.current = editor;

    function resolveTargetNodeName() {
      const mode = globalThis.EditorTextMode || "all";
      if (mode === "verses") return "sectionCover";
      if (mode === "headings") return "sectionTitle";
      return null; // for "all"
    }
    function applyMarkToNamedNodes(editor, nodeName, markName, attrs = {}) {
      const { state, view } = editor;
      const { tr, schema } = state;
      const markType = schema.marks[markName];
      const targetNodeType = schema.nodes[nodeName];
      if (!markType || !targetNodeType) return;
      state.doc.descendants((node, pos) => {
        if (node.type === targetNodeType) {
          let offset = 0;
          node.forEach((child) => {
            const childStart = pos + 1 + offset;
            const childEnd = childStart + child.nodeSize;
            tr.addMark(childStart, childEnd, markType.create(attrs));
            offset += child.nodeSize;
          });
        }
      });
      if (tr.docChanged) view.dispatch(tr);
    }

    globalThis.EditorFns = {
      bold: () => {
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, "bold");
        } else {
          editor.chain().focus().toggleBold().run();
        }
      },
      italic: () => {
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, "italic");
        } else {
          editor.chain().focus().toggleItalic().run();
        }
      },
      underline: () => {
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, "underline");
        } else {
          editor.chain().focus().toggleUnderline().run();
        }
      },
      strikethrough: () => {
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, "strike");
        } else {
          editor.chain().focus().toggleStrike().run();
        }
      },
      superscript: () => editor.chain().focus().toggleSuperscript().run(),
      subscript: () => editor.chain().focus().toggleSubscript().run(),
      alignLeft: () => editor.chain().focus().setTextAlign("left").run(),
      alignCenter: () => editor.chain().focus().setTextAlign("center").run(),
      alignRight: () => editor.chain().focus().setTextAlign("right").run(),
      alignJustify: () => editor.chain().focus().setTextAlign("justify").run(),
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      toggleBulletList: () => editor.chain().focus().toggleBulletList().run(),
      toggleOrderedList: () => editor.chain().focus().toggleOrderedList().run(),
      onFontStyleChange: (style) => {
        if (style === "bold") editor.chain().focus().toggleBold().run();
        else if (style === "italic")
          editor.chain().focus().toggleItalic().run();
        else if (style === "light")
          editor
            .chain()
            .focus()
            .setMark("customStyle", { style: "font-weight: 300;" })
            .run();
        else editor.chain().focus().unsetAllMarks().run();
      },
      onParagraphChange: (value) => {
        if (value === "p") editor.chain().focus().setParagraph().run();
        else if (value.startsWith("h")) {
          const level = parseInt(value.replace("h", ""), 10);
          editor.chain().focus().toggleHeading({ level }).run();
        }
      },
      insertAttachment: (name, url) => {
        editor
          .chain()
          .focus()
          .insertContent(
            `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`
          )
          .run();
      },
      insertLink: (url) =>
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run(),
      removeLink: () => editor.chain().focus().unsetLink().run(),
      insertImage: (url) => editor.chain().focus().setImage({ src: url }).run(),
      setLineHeight: (height) => {
        const { state, view } = editor;
        const { tr } = state;
        const markType = state.schema.marks.lineHeight;
        if (!markType) return;
        state.doc.descendants((node, pos) => {
          if (node.isTextblock) {
            const from = pos + 1;
            const to = pos + node.content.size + 1;
            tr.addMark(from, to, markType.create({ lineHeight: height }));
          }
        });
        if (tr.docChanged) view.dispatch(tr);
      },
      clear: () => {
        const node = (function () {
          const mode = globalThis.EditorTextMode || "all";
          if (mode === "verses") return "sectionCover";
          if (mode === "headings") return "sectionTitle";
          return null;
        })();
        if (node) {
          const { state, view } = editor;
          const { tr } = state;
          const allMarks = Object.values(state.schema.marks);
          state.doc.descendants((n, pos) => {
            if (n.type.name === node) {
              let offset = 0;
              n.forEach((child) => {
                const from = pos + 1 + offset;
                const to = from + child.nodeSize;
                allMarks.forEach((mark) => tr.removeMark(from, to, mark));
                offset += child.nodeSize;
              });
            }
          });
          if (tr.docChanged) view.dispatch(tr);
        } else {
          editor.chain().focus().clearNodes().unsetAllMarks().run();
        }
      },
      setTextColor: (color) => {
        setTextColor(color);
        const node = (function () {
          const mode = globalThis.EditorTextMode || "all";
          if (mode === "verses") return "sectionCover";
          if (mode === "headings") return "sectionTitle";
          return null;
        })();
        if (node) {
          applyMarkToNamedNodes(editor, node, "textStyle", { color });
        } else {
          editor.chain().focus().setColor(color).run();
        }
      },
      setHighlightColor: (color) => {
        setBgColor(color);
        const node = (function () {
          const mode = globalThis.EditorTextMode || "all";
          if (mode === "verses") return "sectionCover";
          if (mode === "headings") return "sectionTitle";
          return null;
        })();
        if (node) {
          applyMarkToNamedNodes(editor, node, "highlight", { color });
        } else {
          editor.chain().focus().setMark("highlight", { color }).run();
        }
      },
      setFontFamily: (font) => {
        const node = (function () {
          const mode = globalThis.EditorTextMode || "all";
          if (mode === "verses") return "sectionCover";
          if (mode === "headings") return "sectionTitle";
          return null;
        })();
        const style = `font-family: ${font};`;
        if (node) applyMarkToNamedNodes(editor, node, "customStyle", { style });
        else editor.chain().focus().setMark("customStyle", { style }).run();
      },
      setFontSize: (size) => {
        const node = (function () {
          const mode = globalThis.EditorTextMode || "all";
          if (mode === "verses") return "sectionCover";
          if (mode === "headings") return "sectionTitle";
          return null;
        })();
        const style = `font-size: ${size}px;`;
        if (node) applyMarkToNamedNodes(editor, node, "customStyle", { style });
        else editor.chain().focus().setMark("customStyle", { style }).run();
      },
      getHtml: () => editor.getHTML() || "",
      setHtml: (html) => editor.commands.setContent(html),
      exportJson: () => {
        const json = editor.getJSON();
        const dataStr =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(json, null, 2));
        const dlAnchor = document.createElement("a");
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", "editor-content.json");
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
      },
      importJson: (json) => {
        try {
          if (typeof json === "string") json = JSON.parse(json);
          editor.commands.setContent(json);
        } catch (error) {
          console.error("Failed to import JSON:", error);
          alert("Invalid JSON format");
        }
      },
      aiHighlight: async (prompt) => {
        const html = editor.getHTML();
        const editorElement = document.getElementById("tiptapEditor");
        editorElement.classList.add("overlay-animated-text");
        editor.setEditable(false);
        const defaultPromt = prompt || tags.editorAIPromt;
        const positivePromt = masks?.editorAIPostive || "";
        const negativePromt = masks?.editorAINegative || "";
        const chat = [
          { role: "system", content: `${defaultPromt}` },
          { role: "system", content: `Avoid: ${negativePromt}` },
          { role: "system", content: `Remember: ${positivePromt}` },
          { role: "user", content: `${html}` },
        ];
        const combinedHtml = await ai.chat([...chat]);
        editor.commands.setContent(combinedHtml.content);
        editorElement.classList.remove("overlay-animated-text");
        editor.setEditable(true);
      },
    };

    return () => {
      editor.destroy();
    };
  }, [enableEditor]);

  useEffect(() => {
    if (!data) return;
    const editor = editorRef.current;
    if (!editor) return;
    const key = `${data?.translation}_${data?.book}_${data?.chapter}`;
    if (localStorage.masks[key])
      os.log("localStorage.masks[key]", localStorage.masks[key]);
    editor.commands.setContent(htmlString);
  }, [data]);

  return (
    <>
      <div style={{ height: "100%", display: !enableEditor ? "" : "none" }}>
        {content}
      </div>
      {enableEditor && content && (
        <>
          <ResponsiveToolbar editor={editorRef.current} />
          <style>{styles}</style>
          <div id="tiptapEditor" style={editorStyle} />
        </>
      )}
    </>
  );
};

// ------- toolbar -------
const editorStyle = {
  minHeight: "300px",
  padding: "15px",
  outline: "none",
  lineHeight: "1.6",
  fontSize: "16px",
};

const iconButtonStyle = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

export function ResponsiveToolbar({ editor }) {
  const [selectedText, setSelectedText] = useState("all");
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");

  // >>> priorities state
  const [priority, setPriority] = useState(() => {
    try {
      return (
        (localStorage?.masks?.[PRIORITY_KEY]?.data &&
          JSON.parse(localStorage.masks[PRIORITY_KEY].data)) ||
        DEFAULT_TOOLBAR_PRIORITY
      );
    } catch {
      return DEFAULT_TOOLBAR_PRIORITY;
    }
  });

  // >>> overflow state
  const toolbarRef = useRef(null);
  const measurerRef = useRef(null);
  const itemsRef = useRef({});
  const [visibleIds, setVisibleIds] = useState([]);
  const [overflowIds, setOverflowIds] = useState([]);
  const [showOverflow, setShowOverflow] = useState(false);

  // >>> simple re-order UI
  const [showTuning, setShowTuning] = useState(false);
  const [draftOrder, setDraftOrder] = useState(priority);

  useEffect(() => {
    globalThis.EditorTextMode = selectedText;
  }, [selectedText]);

  globalThis.EditorToolbar = {
    setPriorities(ids) {
      if (!Array.isArray(ids) || !ids.length) return;
      setPriority(ids);
      persistPriority(ids);
    },
    getPriorities() {
      return priority.slice();
    },
    resetPriorities() {
      setPriority(DEFAULT_TOOLBAR_PRIORITY);
      persistPriority(DEFAULT_TOOLBAR_PRIORITY);
    },
  };

  const persistPriority = (ids) => {
    localStorage.masks[PRIORITY_KEY] = {
      key: PRIORITY_KEY,
      data: JSON.stringify(ids),
    };
  };

  // dropdown choices
  const alignmentOptions = [
    { label: "Left", icon: "format_align_left", value: "left" },
    { label: "Center", icon: "format_align_center", value: "center" },
    { label: "Right", icon: "format_align_right", value: "right" },
    { label: "Justify", icon: "format_align_justify", value: "justify" },
  ];
  const listOptions = [
    { label: "Bulleted", icon: "format_list_bulleted", value: "bulletList" },
    { label: "Numbered", icon: "format_list_numbered", value: "orderedList" },
  ];

  const handleTextColorChange = (color) => {
    setTextColor(color);
    globalThis.EditorFns?.setTextColor(color);
  };
  const handleBgColorChange = (color) => {
    setBgColor(color);
    globalThis.EditorFns?.setHighlightColor(color);
  };
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    globalThis.EditorFns?.setFontSize(size.toString());
  };
  const handleFontFamilyChange = (font) => {
    globalThis.EditorFns?.setFontFamily(font);
  };
  const handleAlignmentSelect = (option) => {
    if (!option) return;
    if (option.value === "left") globalThis.EditorFns?.alignLeft();
    else if (option.value === "center") globalThis.EditorFns?.alignCenter();
    else if (option.value === "right") globalThis.EditorFns?.alignRight();
    else if (option.value === "justify") globalThis.EditorFns?.alignJustify();
  };
  const handleListSelect = (option) => {
    if (!option) return;
    if (option.value === "bulletList")
      globalThis.EditorFns?.toggleBulletList?.();
    else if (option.value === "orderedList")
      globalThis.EditorFns?.toggleOrderedList?.();
  };
  const [spacing, setSpacing] = useState();
  const handleSpaceSelect = (val) => {
    setSpacing(val);
    globalThis.EditorFns?.setLineHeight(val);
  };
  const handleAIPrompt = async (prompt) => {
    globalThis.EditorFns?.aiHighlight?.(prompt);
  };

  // build toolbar items
  const colorInputStyle = {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "none",
    outline: "none",
    cursor: "pointer",
    padding: "0",
  };
  const allItemsById = {
    "text-select": {
      id: "text-select",
      node: (
        <TextSelect
          key="text-select"
          selectedText={selectedText}
          onTextSelect={setSelectedText}
        />
      ),
    },
    bold: {
      id: "bold",
      node: (
        <button
          key="bold"
          onClick={() => globalThis.EditorFns?.bold()}
          style={iconButtonStyle}
          title="Bold"
        >
          <span className="material-symbols-outlined">format_bold</span>
        </button>
      ),
    },
    italic: {
      id: "italic",
      node: (
        <button
          key="italic"
          onClick={() => globalThis.EditorFns?.italic()}
          style={iconButtonStyle}
          title="Italic"
        >
          <span className="material-symbols-outlined">format_italic</span>
        </button>
      ),
    },
    underline: {
      id: "underline",
      node: (
        <button
          key="underline"
          onClick={() => globalThis.EditorFns?.underline()}
          style={iconButtonStyle}
          title="Underline"
        >
          <span className="material-symbols-outlined">format_underlined</span>
        </button>
      ),
    },
    strikethrough: {
      id: "strikethrough",
      node: (
        <button
          key="strikethrough"
          onClick={() => globalThis.EditorFns?.strikethrough()}
          style={iconButtonStyle}
          title="Strikethrough"
        >
          <span className="material-symbols-outlined">
            format_strikethrough
          </span>
        </button>
      ),
    },
    superscript: {
      id: "superscript",
      node: (
        <button
          key="superscript"
          onClick={() => globalThis.EditorFns?.superscript()}
          style={iconButtonStyle}
          title="Superscript"
        >
          <span className="material-symbols-outlined">superscript</span>
        </button>
      ),
    },
    subscript: {
      id: "subscript",
      node: (
        <button
          key="subscript"
          onClick={() => globalThis.EditorFns?.subscript()}
          style={iconButtonStyle}
          title="Subscript"
        >
          <span className="material-symbols-outlined">subscript</span>
        </button>
      ),
    },
    align: {
      id: "align",
      node: (
        <CustomDropdown
          key="align"
          options={alignmentOptions}
          onSelect={handleAlignmentSelect}
          defaultValue={alignmentOptions[0]}
        />
      ),
    },
    list: {
      id: "list",
      node: (
        <CustomDropdown
          key="list"
          options={listOptions}
          onSelect={handleListSelect}
          defaultValue={listOptions[0]}
        />
      ),
    },
    "line-spacing": {
      id: "line-spacing",
      node: (
        <InputWithIcon
          key="line-spacing"
          icon={
            <span class="material-symbols-outlined">format_line_spacing</span>
          }
          value={spacing}
          onChange={handleSpaceSelect}
          placeholder="1.6"
        />
      ),
    },
    attach: {
      id: "attach",
      node: (
        <button
          key="attach"
          onClick={() => uploadAttachmentAndInsert()}
          style={iconButtonStyle}
          title="Attach File"
        >
          <span className="material-symbols-outlined">attach_file</span>
        </button>
      ),
    },
    image: {
      id: "image",
      node: (
        <button
          key="image"
          onClick={() => uploadImageAndInsert()}
          style={iconButtonStyle}
          title="Insert Image"
        >
          <span className="material-symbols-outlined">image</span>
        </button>
      ),
    },
    "text-color": {
      id: "text-color",
      node: (
        <div
          key="text-color"
          style={{ display: "flex", alignItems: "center", gap: "4px" }}
        >
          <span className="material-symbols-outlined">title</span>
          <input
            type="color"
            value={textColor}
            onChange={(e) => handleTextColorChange(e.target.value)}
            style={colorInputStyle}
            title="Text Color"
          />
        </div>
      ),
    },
    "bg-color": {
      id: "bg-color",
      node: (
        <div
          key="bg-color"
          style={{ display: "flex", alignItems: "center", gap: "4px" }}
        >
          <span className="material-symbols-outlined">border_color</span>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => handleBgColorChange(e.target.value)}
            style={colorInputStyle}
            title="Highlight Color"
          />
        </div>
      ),
    },
    paragraph: {
      id: "paragraph",
      node: (
        <ParagraphSelect
          key="paragraph"
          onParagraphChange={globalThis.EditorFns?.onParagraphChange}
        />
      ),
    },
    "font-family": {
      id: "font-family",
      node: (
        <FontFamilySelect
          key="font-family"
          onFontFamilyChange={handleFontFamilyChange}
        />
      ),
    },
    "font-style": {
      id: "font-style",
      node: (
        <FontStyleSelect
          key="font-style"
          onFontStyleChange={globalThis.EditorFns?.onFontStyleChange}
        />
      ),
    },
    "font-size": {
      id: "font-size",
      node: (
        <Counter
          key="font-size"
          value={fontSize}
          onChange={handleFontSizeChange}
        />
      ),
    },
    undo: {
      id: "undo",
      node: (
        <button
          key="undo"
          onClick={() => globalThis.EditorFns?.undo()}
          style={iconButtonStyle}
          title="Undo"
        >
          <span className="material-symbols-outlined">undo</span>
        </button>
      ),
    },
    redo: {
      id: "redo",
      node: (
        <button
          key="redo"
          onClick={() => globalThis.EditorFns?.redo()}
          style={iconButtonStyle}
          title="Redo"
        >
          <span className="material-symbols-outlined">redo</span>
        </button>
      ),
    },
    clear: {
      id: "clear",
      node: (
        <button
          key="clear"
          onClick={() => globalThis.EditorFns?.clear()}
          style={iconButtonStyle}
          title="Clear Formatting"
        >
          <span className="material-symbols-outlined">format_clear</span>
        </button>
      ),
    },
    print: {
      id: "print",
      node: (
        <button
          key="print"
          onClick={() => window.print()}
          style={iconButtonStyle}
          title="Print"
        >
          <span className="material-symbols-outlined">print</span>
        </button>
      ),
    },
    margin1: {
      id: "margin1",
      node: (
        <InputWithIcon
          key="margin1"
          icon={<MarginYIcon />}
          value={12}
          onChange={(val) => {
            const el = document.getElementById("tiptapEditor");
            if (!el) return;
            el.style.paddingTop = `${val}px`;
            el.style.paddingBottom = `${val}px`;
          }}
          placeholder="Vertical"
        />
      ),
    },
    margin2: {
      id: "margin2",
      node: (
        <InputWithIcon
          key="margin2"
          icon={<MarginXIcon />}
          value={12}
          onChange={(val) => {
            const el = document.getElementById("tiptapEditor");
            if (!el) return;
            el.style.paddingLeft = `${val}px`;
            el.style.paddingRight = `${val}px`;
          }}
          placeholder="Horizontal"
        />
      ),
    },
    "ai-prompt": {
      id: "ai-prompt",
      node: <AIPromptInput key="ai-prompt" onAIPrompt={handleAIPrompt} />,
    },
    download: {
      id: "download",
      node: (
        <button
          key="download"
          onClick={() => globalThis.EditorFns?.exportJson()}
          style={iconButtonStyle}
          title="Download"
        >
          <span className="material-symbols-outlined">file_download</span>
        </button>
      ),
    },
    upload: {
      id: "upload",
      node: (
        <button
          key="upload"
          onClick={() => uploadFile()}
          style={iconButtonStyle}
          title="Upload"
        >
          <span className="material-symbols-outlined">upload_file</span>
        </button>
      ),
    },
    // >>> a tiny “tune” button for end users to reorder
    __tune__: {
      id: "__tune__",
      node: (
        <button
          key="tune"
          onClick={() => {
            setDraftOrder(priority);
            setShowTuning(true);
          }}
          title="Customize toolbar"
          style={iconButtonStyle}
        >
          <span className="material-symbols-outlined">tune</span>
        </button>
      ),
    },
  };

  // ordered item ids = priority + any missing ids appended
  const allIds = Object.keys(allItemsById).filter((x) => x !== "__tune__");
  const orderedIds = (() => {
    const known = priority.filter((id) => allIds.includes(id));
    const missing = allIds.filter((id) => !known.includes(id));
    return [...known, ...missing, "__tune__"]; // tune button last
  })();

  // measure & compute visible/overflow
  const computeLayout = () => {
    const toolbarEl = toolbarRef.current;
    const measurerEl = measurerRef.current;
    if (!toolbarEl || !measurerEl) return;

    const toolbarWidth = toolbarEl.clientWidth;
    const overflowBtnWidth = 44; // dots button
    const safety = 8; // padding buffer
    const available = Math.max(0, toolbarWidth - overflowBtnWidth - safety);

    let used = 0;
    const visible = [];
    const overflow = [];

    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const el = itemsRef.current[id];
      if (!el) continue;
      const w = el.offsetWidth + 14; // account for gap
      if (used + w <= available) {
        visible.push(id);
        used += w;
      } else {
        overflow.push(id);
      }
    }
    setVisibleIds(visible);
    setOverflowIds(overflow);
  };

  // recompute on size changes (ResizeObserver + window resize)
  useEffect(() => {
    const ro = new ResizeObserver(() => computeLayout());
    if (toolbarRef.current) ro.observe(toolbarRef.current);
    const onWin = () => computeLayout();
    window.addEventListener("resize", onWin);
    // initial pass after mount
    const t = setTimeout(computeLayout, 120);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
      clearTimeout(t);
    };
  }, [orderedIds.join("|")]);

  // UI for priority tuning
  const moveInDraft = (index, dir) => {
    setDraftOrder((prev) => {
      const a = prev.slice();
      const j = index + dir;
      if (j < 0 || j >= a.length) return a;
      const tmp = a[index];
      a[index] = a[j];
      a[j] = tmp;
      return a;
    });
  };
  const saveDraft = () => {
    setPriority(draftOrder);
    persistPriority(draftOrder);
    setShowTuning(false);
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <div className="tiptapToolbar" ref={toolbarRef}>
        <div className="toolbar-measurer" ref={measurerRef}>
          {orderedIds.map((id) => (
            <div
              key={`measure-${id}`}
              ref={(el) => (itemsRef.current[id] = el)}
              className="toolbar-item-measurer"
            >
              {allItemsById[id]?.node}
            </div>
          ))}
        </div>

        {visibleIds.map((id) => (
          <div key={`vis-${id}`} className="toolbar-item">
            {allItemsById[id]?.node}
          </div>
        ))}

        <div className="toolbar-item">
          <button
            className="overflow-button"
            onClick={() => setShowOverflow((v) => !v)}
            title="More"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>

      {showOverflow && (
        <div className="overflow-tray">
          {overflowIds.length === 0 && (
            <div className="overflow-empty">No more items</div>
          )}
          {overflowIds.map((id) => (
            <div key={`of-${id}`} className="overflow-item">
              {allItemsById[id]?.node}
            </div>
          ))}
        </div>
      )}

      {showTuning && (
        <div className="tuning-backdrop" onClick={() => setShowTuning(false)}>
          <div className="tuning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tuning-header">
              <div>Customize toolbar order</div>
              <button
                className="tuning-close"
                onClick={() => setShowTuning(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="tuning-body">
              {draftOrder.map((id, idx) => (
                <div key={`draft-${id}`} className="tuning-row">
                  <div className="tuning-id">{id}</div>
                  <div className="tuning-arrows">
                    <button onClick={() => moveInDraft(idx, -1)} title="Up">
                      <span className="material-symbols-outlined">
                        keyboard_arrow_up
                      </span>
                    </button>
                    <button onClick={() => moveInDraft(idx, 1)} title="Down">
                      <span className="material-symbols-outlined">
                        keyboard_arrow_down
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="tuning-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setDraftOrder(DEFAULT_TOOLBAR_PRIORITY);
                }}
              >
                Reset
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn-primary" onClick={saveDraft}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ------- toolbar components -------
function TextSelect({ selectedText, onTextSelect }) {
  return (
    <select
      className="textToEdit"
      value={selectedText || "all"}
      onChange={(e) => onTextSelect(e.target.value)}
      style={{
        padding: "6px 8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        fontSize: "14px",
        minWidth: "80px",
      }}
    >
      <option value="all">All text</option>
      <option value="headings">Headings</option>
      <option value="verses">Verse</option>
    </select>
  );
}
function ParagraphSelect({ onParagraphChange }) {
  return (
    <select
      onChange={(e) => onParagraphChange(e.target.value)}
      style={{
        width: "50px",
        height: "30px",
        color: "#5F5E5C",
        border: "1px solid #ccc",
        outline: "none",
        borderRadius: "6px",
        fontSize: "12px",
      }}
    >
      <option value="p">P</option>
      <option value="h1">H1</option>
      <option value="h2">H2</option>
      <option value="h3">H3</option>
    </select>
  );
}
function FontFamilySelect({ onFontFamilyChange }) {
  const fonts = [
    "DM Sans",
    "Arial",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana",
  ];
  return (
    <select
      onChange={(e) => onFontFamilyChange(e.target.value)}
      style={{
        width: "90px",
        height: "30px",
        color: "#5F5E5C",
        border: "1px solid #ccc",
        outline: "none",
        borderRadius: "6px",
        fontSize: "12px",
      }}
    >
      {fonts.map((font) => (
        <option key={font} value={font}>
          {font}
        </option>
      ))}
    </select>
  );
}
function FontStyleSelect({ onFontStyleChange }) {
  return (
    <select
      onChange={(e) => onFontStyleChange(e.target.value)}
      style={{
        width: "70px",
        height: "30px",
        color: "#5F5E5C",
        border: "1px solid #ccc",
        outline: "none",
        borderRadius: "6px",
        fontSize: "12px",
      }}
    >
      <option value="normal">Normal</option>
      <option value="bold">Bold</option>
      <option value="italic">Italic</option>
      <option value="light">Light</option>
    </select>
  );
}
function AIPromptInput({ onAIPrompt }) {
  const [inputValue, setInputValue] = useState("");
  const handleSubmit = () => {
    onAIPrompt(inputValue);
    setInputValue("");
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSubmit();
  };
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#f3f4f6",
        borderRadius: "24px",
        padding: "2px",
        minWidth: "200px",
        gap: "12px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: "all 0.2s ease",
        border: "none",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
    >
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="AI Prompt..."
        style={{
          backgroundColor: "transparent",
          border: "none",
          outline: "none",
          color: "#374151",
          fontSize: "14px",
          fontWeight: "400",
          letterSpacing: "-0.01em",
          lineHeight: "1.2",
          flex: 1,
          fontFamily: "inherit",
          padding: "8px 12px",
        }}
      />
      <div
        onClick={handleSubmit}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          backgroundColor: "#f9d5cc",
          borderRadius: "50%",
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ color: "#8b4513" }}
        >
          <path
            d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"
            fill="currentColor"
          />
          <path
            d="M12 1L12.75 3.25L15 4L12.75 4.75L12 7L11.25 4.75L9 4L11.25 3.25L12 1Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
}
function Counter({ value, onChange, min = 8, max = 72 }) {
  const [fontSize, setFontSize] = useState(16);
  const increment = () => {
    if (fontSize < max) {
      const size = fontSize + 1;
      setFontSize(size);
      globalThis.EditorFns?.setFontSize(size.toString());
    }
  };
  const decrement = () => {
    if (fontSize > min) {
      const size = fontSize - 1;
      setFontSize(size);
      globalThis.EditorFns?.setFontSize(size.toString());
    }
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "transparent",
        borderRadius: "50px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        border: "1px solid #DADADA",
        padding: "2px",
      }}
    >
      <button
        onClick={decrement}
        style={{
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          backgroundColor: "transparent",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "300",
        }}
      >
        −
      </button>
      <div
        style={{
          fontSize: "14px",
          fontWeight: "500",
          color: "#5F5E5C",
          minWidth: "40px",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        {fontSize}
      </div>
      <button
        onClick={increment}
        style={{
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          backgroundColor: "transparent",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "300",
        }}
      >
        +
      </button>
    </div>
  );
}
function InputWithIcon({ icon, value, onChange, placeholder = "" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        border: "1px solid #ccc",
        borderRadius: "6px",
        backgroundColor: "white",
        minWidth: "60px",
      }}
    >
      <div style={{ fontSize: "16px", color: "#666" }}>{icon}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder}
        style={{
          border: "none",
          outline: "none",
          width: "40px",
          fontSize: "14px",
          textAlign: "center",
        }}
      />
    </div>
  );
}
function CustomDropdown({
  options = [],
  onSelect,
  label = "Select",
  defaultValue,
}) {
  const [selected, setSelected] = useState(defaultValue || options[0]);
  const [open, setOpen] = useState(false);
  const handleSelect = (option) => {
    setSelected(option);
    setOpen(false);
    if (onSelect) onSelect(option);
  };
  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 8px",
          borderRadius: "6px",
          cursor: "pointer",
          minWidth: "40px",
        }}
      >
        {selected?.icon && (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "18px" }}
          >
            {selected.icon}
          </span>
        )}
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "16px", marginLeft: "auto" }}
        >
          {open ? "expand_less" : "expand_more"}
        </span>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "6px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            zIndex: 1000,
            marginTop: "2px",
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(option);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "14px",
                borderBottom: "1px solid #eee",
              }}
            >
              {option.icon && (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "18px" }}
                >
                  {option.icon}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------- styles -------
const styles = `
#tiptapEditor{ padding:0px; }
.tiptapToolbar {
  width: 100%;
  background-color: var(--themeSideMenu);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 10px;
  gap: 14px;
  position: relative;
  overflow: visible;
  flex-wrap: nowrap;
  border-bottom: 1px solid #e5e5e5;
}

.toolbar-measurer {
  position: absolute;
  top: 0;
  left: -9999px;
  visibility: hidden;
  display: flex;
  gap: 14px;
  align-items: center;
  height: 0;
  padding: 0;
}

.toolbar-item-measurer { display: inline-flex; align-items: center; }
.toolbar-item { display: inline-flex; align-items: center; flex-shrink: 0; }

.overflow-button {
  background: transparent; border: none; cursor: pointer;
  border-radius: 6px; display: flex; align-items: center; justify-content: center;
  padding: 6px;
}

.overflow-tray {
 position: relative;
  width: 100%;
  display: flex;            /* switched from grid to flex */
  flex-wrap: wrap;          /* allows wrapping onto multiple lines */
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}
.overflow-item {
  display: inline-flex; align-items: center; justify-content: flex-start;
  padding: 4px 6px;
  border-radius: 6px;
}
.overflow-empty { color: #777; font-size: 12px; padding: 6px 2px; }

.textToEdit {
  width: 90px; height: 28px; border-radius: 30px;
  background-color: #d364334d; border: none; color: #5f5e5c; outline: none; padding: 5px;
}

.material-symbols-outlined { font-size: 20px; }

/* tuning dialog */
.tuning-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.25);
  display: flex; align-items: center; justify-content: center; z-index: 3000;
}
.tuning-modal {
  width: min(720px, 90vw);
  max-height: 80vh;
  overflow: hidden;
  background: #fff; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: flex; flex-direction: column;
}
.tuning-header {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  border-bottom: 1px solid #eee; font-weight: 600;
}
.tuning-close {
  margin-left: auto; border: none; background: transparent; cursor: pointer;
}
.tuning-body {
  padding: 10px 16px; overflow: auto; max-height: 60vh;
}
.tuning-row {
  display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 8px;
}
.tuning-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px; color: #444; background: #f7f7f7; padding: 4px 6px; border-radius: 6px;
}
.tuning-arrows button {
  border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 6px; padding: 2px 4px; margin-left: 4px;
}
.tuning-footer {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-top: 1px solid #eee;
}
.btn-primary {
  background: #1f6feb; color: white; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer;
}
.btn-secondary {
  background: #efefef; color: #333; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer;
}

/* responsive */
@media (max-width: 768px) {
  .tiptapToolbar { gap: 10px; padding: 6px 8px; }
  .overflow-tray { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
}
@media (max-width: 480px) {
  .tiptapToolbar { gap: 8px; padding: 6px; }
  .overflow-tray { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
}
`;

export { TextEditor };
