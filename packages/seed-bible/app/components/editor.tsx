const { useEffect, useState, useRef } = os.appHooks;
import { Editor } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import render from 'https://esm.run/preact-render-to-string';
import { TextStyle } from 'https://esm.sh/@tiptap/extension-text-style';
import { Color } from 'https://esm.sh/@tiptap/extension-color';
import { Node } from 'https://esm.sh/@tiptap/core';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align';
import Underline from 'https://esm.sh/@tiptap/extension-underline';
import Superscript from 'https://esm.sh/@tiptap/extension-superscript';
import Subscript from 'https://esm.sh/@tiptap/extension-subscript';
import Highlight from 'https://esm.sh/@tiptap/extension-highlight';
import { Mark } from 'https://esm.sh/@tiptap/core';
import { MarginYIcon, MarginXIcon } from 'app.components.icons'
import Image from 'https://esm.sh/@tiptap/extension-image';
import Link from 'https://esm.sh/@tiptap/extension-link';
import BulletList from 'https://esm.sh/@tiptap/extension-bullet-list';
import OrderedList from 'https://esm.sh/@tiptap/extension-ordered-list';
import ListItem from 'https://esm.sh/@tiptap/extension-list-item';
const localStorage = getBot('system', 'app.localStorage')

async function uploadAttachmentAndInsert() {
  const files = await os.showUploadFiles();

  if (files.length === 0) return;

  const file = files[0];

  // Convert file to base64 or upload to server and get the URL
  const fileUrl = await uploadToServerOrBase64(file);
  const fileName = file.name || 'download';

  if (globalThis.EditorFns?.insertAttachment && fileUrl) {
    globalThis.EditorFns.insertAttachment(fileName, fileUrl);
  }
}

async function uploadImageAndInsert() {
  const files = await os.showUploadFiles({ accept: 'image/*' });

  if (files.length === 0) return;

  const file = files[0];
  console.log(file)

  // Use the same importJson-style upload logic
  // Assuming `file.data` is a base64 or Blob or can be turned into a URL
  const imageUrl = await uploadToServerOrBase64(file); // You need to implement this based on your app


  // Insert the image into the editor
  if (globalThis.EditorFns?.insertImage && imageUrl) {
    globalThis.EditorFns.insertImage(imageUrl);
  }
}
async function uploadToServerOrBase64(file) {
  // Return data URL
  return `data:${file.mimeType};base64,${bytes.toBase64String(file.data)}`;
}

async function uploadFile() {
  const files = await os.showUploadFiles();

  if (files.length <= 0) {
    return;
  }

  const file = files[0];
  globalThis.EditorFns.importJson(file.data);
}
const LineHeight = Mark.create({
  name: 'lineHeight',
  addAttributes() {
    return {
      lineHeight: {
        default: null,
        parseHTML: element => element.style.lineHeight || null,
        renderHTML: attributes => {
          if (!attributes.lineHeight) return {};
          return { style: `line-height: ${attributes.lineHeight}` };
        },
      },
    };
  },
  parseHTML() {
    return [{ style: 'line-height' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
});

const CustomStyle = Mark.create({
  name: 'customStyle',
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          return attributes.style ? { style: attributes.style } : {};
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
});

export const BookTitle = Node.create({
  name: 'bookTitle',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'div.bookTitle' }];
  },
  renderHTML() {
    return ['div', { class: 'bookTitle' }, 0];
  },
});

export const SectionTitle = Node.create({
  name: 'sectionTitle',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'div.sectionTitle' }];
  },
  renderHTML() {
    return ['div', { class: 'sectionTitle' }, 0];
  },
});

export const SectionCover = Node.create({
  name: 'sectionCover',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'div.sectionCover' }];
  },
  renderHTML() {
    return ['div', { class: 'sectionCover' }, 0];
  },
});

export const SectionText = Node.create({
  name: 'sectionText',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'div.sectionText' }];
  },
  renderHTML() {
    return ['div', { class: 'sectionText' }, 0];
  },
});

export const SectionTextNumber = Node.create({
  name: 'sectionTextNumber',
  group: 'inline',
  inline: true,
  content: 'text*',
  parseHTML() {
    return [{ tag: 'span.sectionTextNumber' }];
  },
  renderHTML() {
    return ['span', { class: 'sectionTextNumber' }, 0];
  },
});

function generateHtmlFromContent(data) {
  if (!data || !data.content) return '';

  const bookTitle = `${data.book} - ${data.chapter}`;

  const sectionsHtml = data.content.map(section => {
    const versesHtml = section.verses.map(verse => {
      return `
                <span class="sectionText">
                    <span class="sectionTextNumber">${verse.verseNumber}</span>
                    ${verse.text}
                </span>
            `;
    }).join('\n');

    return `
            <div class="section">
                <div class="sectionTitle">${section.heading}</div>
                <div class="sectionCover">
                    ${versesHtml}
                </div>
            </div>
        `;
  }).join('\n');

  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${bookTitle}</title>
        </head>
        <body>
            <div class="bookTitle">${bookTitle}</div>
            ${sectionsHtml}
        </body>
        </html>
    `;
}

function segmentHtmlBySectionEnd(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const segments = [];
  let currentSegmentNodes = [];
  const bodyChildren = Array.from(doc.body.childNodes);

  for (let node of bodyChildren) {
    currentSegmentNodes.push(node);

    if (
      node.nodeType === 1 &&
      node.tagName.toLowerCase() === 'div' &&
      node.classList.contains('sectionCover')
    ) {
      const tempDoc = document.implementation.createHTMLDocument();
      currentSegmentNodes.forEach(n => tempDoc.body.appendChild(n.cloneNode(true)));
      segments.push(tempDoc.body.innerHTML);
      currentSegmentNodes = [];
    }
  }

  if (currentSegmentNodes.length > 0) {
    const tempDoc = document.implementation.createHTMLDocument();
    currentSegmentNodes.forEach(n => tempDoc.body.appendChild(n.cloneNode(true)));
    segments.push(tempDoc.body.innerHTML);
  }

  return segments;
}

const TextEditor = ({ content, tab, data, setEnableEditor, enableEditor }) => {
  if (!tab) return content;

  const editorRef = useRef(null);
  const toolbarRef = useRef(null);
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hiddenItems, setHiddenItems] = useState([]);
  const [showAllItems, setShowAllItems] = useState(false);
  const [paddingY, setPaddingY] = useState(0)
  const [paddingX, setPaddingX] = useState(0)
  const formatText = (command, value = null) => {
    if (editorRef.current && editorRef.current.editor) {
      editorRef.current.editor.chain().focus()[command](value).run();
    } else {
      console.error('Editor is not initialized yet');
    }
  };

  const changeBlockFormat = (value) => {
    const editor = editorRef.current?.editor;
    if (!editor) return;

    if (value === 'p') {
      editor.chain().focus().setParagraph().run();
    } else if (value === 'blockquote') {
      editor.chain().focus().toggleBlockquote().run();
    } else if (['h1', 'h2', 'h3'].includes(value)) {
      const level = parseInt(value.replace('h', ''), 10);
      editor.chain().focus().toggleHeading({ level }).run();
    } else {
      console.warn('Unknown block format:', value);
    }
  };

  const debounce = (fn, delay = 100) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  // Check toolbar overflow and hide/show items
  const checkToolbarOverflow = () => {
    if (!toolbarRef.current) return;

    const toolbar = toolbarRef.current;
    const items = Array.from(toolbar.children).filter(
      el => !el.classList.contains('toolbar-toggle-btn') &&
        !el.classList.contains('toolbar-dropdown-menu') &&
        !el.classList.contains('toolbar-controls')
    );

    // Reset visibility
    items.forEach(el => el.style.display = 'flex');

    // If showing all items, don't hide anything
    if (showAllItems) {
      setHiddenItems([]);
      return;
    }

    const controlsSection = toolbar.querySelector('.toolbar-controls');
    const controlsWidth = controlsSection ? controlsSection.offsetWidth : 100;
    const toolbarWidth = toolbar.offsetWidth;
    let currentWidth = controlsWidth;
    const hidden = [];

    // Pre-measure all widths before hiding
    const widths = items.map(el => el.offsetWidth + 8);

    for (let i = 0; i < widths.length; i++) {
      currentWidth += widths[i];
      if (currentWidth > toolbarWidth) {
        hidden.push(i);
      }
    }

    hidden.forEach(i => {
      items[i].style.display = 'none';
    });

    setHiddenItems(hidden);
  };

  const toggleShowAllItems = () => {
    setShowAllItems(!showAllItems);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (!toolbarRef.current) return;

    const observer = new ResizeObserver(() => {
      checkToolbarOverflow();
    });

    observer.observe(toolbarRef.current);

    setTimeout(checkToolbarOverflow, 200);

    return () => observer.disconnect();
  }, [enableEditor, showAllItems]);

  const htmlString = generateHtmlFromContent(data);

  useEffect(() => {
    const saveData = (editor) => {
      const key = `${data.translation}_${data.book}_${data.chapter}`;
      const json = editor.getJSON();
      localStorage.masks[key] = { key, data: JSON.stringify(json) }
      os.log('data saved', key, localStorage.masks[key])
    }

    const editor = new Editor({
      element: editorRef.current,
      onUpdate({ editor }) {
        saveData(editor)
      },
      extensions: [
        StarterKit.configure({
          heading: true,
          blockquote: true,
          paragraph: true,
          paragraph: {
            HTMLAttributes: {
              style: 'text-align: left;',
            },
          },
        }),
        TextStyle,
        Color.configure({ types: ['textStyle'] }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          defaultAlignment: 'left',
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
        Image.configure({
          inline: false,
          allowBase64: true,
        }),
        Link.configure({
          openOnClick: true,
          linkOnPaste: true,
        }),
        Highlight.configure({ multicolor: true }),
      ],
      content: htmlString || '<p style="text-align: left;">Hello World!</p>',
    });

    editorRef.current = editor;
    function resolveTargetNodeName() {
      const mode = globalThis.EditorTextMode || 'all';
      if (mode === 'verses') return 'sectionCover';
      if (mode === 'headings') return 'sectionTitle';
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

      if (tr.docChanged) {
        view.dispatch(tr);
      }
    }



    globalThis.EditorFns = {
      bold: () => {
        const mode = globalThis.EditorTextMode || 'all';

        if (mode === 'all') {
          editor.chain().focus().toggleBold().run();
        } else if (mode === 'verse') {
          applyMarkToNodeType(editor, 'sectionCover', 'bold');
        } else if (mode === 'section') {
          applyMarkToNodeType(editor, 'section', 'bold');
        }
      }
      ,
      italic: () => {
        const mode = globalThis.EditorTextMode || 'all';
        if (mode === 'all') {
          editor.chain().focus().toggleItalic().run();
        } else if (mode === 'verse') {
          applyMarkToMatchingNodes(editor, 'italic');
        } else if (mode === 'section') {
          applyMarkToMatchingNodes(editor, 'italic', {}, 'section');
        }
      }
      ,
      underline: () => editor.chain().focus().toggleUnderline().run(),
      strikethrough: () => {
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, 'strike');
        } else {
          editor.chain().focus().toggleStrike().run();
        }
      }
      ,
      superscript: () => editor.chain().focus().toggleSuperscript().run(),
      subscript: () => editor.chain().focus().toggleSubscript().run(),
      alignLeft: () => editor.chain().focus().setTextAlign('left').run(),
      alignCenter: () => editor.chain().focus().setTextAlign('center').run(),
      alignRight: () => editor.chain().focus().setTextAlign('right').run(),
      alignJustify: () => editor.chain().focus().setTextAlign('justify').run(),
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      toggleBulletList: () => editor.chain().focus().toggleBulletList().run(),
      toggleOrderedList: () => editor.chain().focus().toggleOrderedList().run(),
      onFontStyleChange: (style) => {
        os.log('onFontStyleChange', style)
        if (style === 'bold') {
          editor.chain().focus().toggleBold().run();
        } else if (style === 'italic') {
          editor.chain().focus().toggleItalic().run();
        } else if (style === 'light') {
          editor.chain().focus().setMark('customStyle', { style: 'font-weight: 300;' }).run();
        } else {
          // Reset to normal
          editor.chain().focus().unsetAllMarks().run();
        }
      },
      onParagraphChange: (value) => {
        os.log('onParagraphChange', value)
        if (value === 'p') {
          editor.chain().focus().setParagraph().run();
        } else if (value.startsWith('h')) {
          const level = parseInt(value.replace('h', ''), 10);
          editor.chain().focus().toggleHeading({ level }).run();
        }
      },

      insertAttachment: (name, url) => {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`)
          .run();
      },

      insertLink: (url) => {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      },
      removeLink: () => {
        editor.chain().focus().unsetLink().run();
      },
      insertImage: (url) => {
        editor.chain().focus().setImage({ src: url }).run();
      },
      setLineHeight: (height) => {
        const { state, view } = editor;
        const { tr, schema } = state;

        const markType = schema.marks.lineHeight;
        if (!markType) return;

        state.doc.descendants((node, pos) => {
          if (node.isTextblock) {
            const from = pos + 1;
            const to = pos + node.content.size + 1;
            tr.addMark(from, to, markType.create({ lineHeight: height }));
          }
        });

        if (tr.docChanged) {
          view.dispatch(tr);
        }
      }



      ,
      clear: () => {
        const node = resolveTargetNodeName();
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
                allMarks.forEach((mark) => {
                  tr.removeMark(from, to, mark);
                });
                offset += child.nodeSize;
              });
            }
          });

          if (tr.docChanged) {
            view.dispatch(tr);
          }
        } else {
          editor.chain().focus().clearNodes().unsetAllMarks().run();
        }
      }
      ,
      setTextColor: (color) => {
        setTextColor(color);
        editor.chain().focus().setColor(color).run();
      },
      setHighlightColor: (color) => {
        setBgColor(color);
        editor.chain().focus().setMark('highlight', { color }).run();
      },
      setFontFamily: (font) => {
        editor.chain().focus().setMark('customStyle', { style: `font-family: ${font};` }).run();
      },
      setFontSize: (size) => {
        const sizeMap = {
          '1': '0.75em',
          '2': '0.875em',
          '3': '1em',
          '4': '1.25em',
          '5': '1.5em',
          '6': '2em',
        };
        const fontSize = size;
        editor.chain().focus().setMark('customStyle', { style: `font-size: ${fontSize}px;` }).run();
      },
      getHtml: () => editor.getHTML() || '',
      setHtml: (html) => editor.commands.setContent(html),
      exportJson: () => {
        const json = editor.getJSON();
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', 'editor-content.json');
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
      },
      importJson: (json) => {
        try {
          if (typeof json === 'string') {
            json = JSON.parse(json);
          }
          editor.commands.setContent(json);
        } catch (error) {
          console.error('Failed to import JSON:', error);
          alert('Invalid JSON format');
        }
      },
      aiHighlight: async (prompt) => {
        let html = editor.getHTML();

        let editorElement = document.getElementById("tiptapEditor")
        editorElement.classList.add('overlay-animated-text');
        editor.setEditable(false);

        let defaultPromt = prompt || tags.editorAIPromt;
        let positivePromt = masks?.editorAIPostive || "";
        let negativePromt = masks?.editorAINegative || "";
        let chat = [
          {
            role: "system",
            content: `${defaultPromt}`
          },
          {
            role: "system",
            content: `Avoid: ${negativePromt}`
          },
          {
            role: "system",
            content: `Remember: ${positivePromt}`
          },
          {
            role: "user",
            content: `${html}`
          }
        ]
        let combinedHtml = await ai.chat([...chat])

        editor.commands.setContent(combinedHtml.content)

        editorElement.classList.remove('overlay-animated-text');
        editor.setEditable(true);
      },
      bold: () => {
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, 'bold');
        } else {
          editor.chain().focus().toggleBold().run();
        }
      },

      italic: () => {
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, 'italic');
        } else {
          editor.chain().focus().toggleItalic().run();
        }
      },

      underline: () => {
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, 'underline');
        } else {
          editor.chain().focus().toggleUnderline().run();
        }
      },

      setTextColor: (color) => {
        setTextColor(color);
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, 'textStyle', { color });
        } else {
          editor.chain().focus().setColor(color).run();
        }
      },

      setHighlightColor: (color) => {
        setBgColor(color);
        const node = resolveTargetNodeName();
        if (node) {
          applyMarkToNamedNodes(editor, node, 'highlight', { color });
        } else {
          editor.chain().focus().setMark('highlight', { color }).run();
        }
      },

      setFontFamily: (font) => {
        const node = resolveTargetNodeName();
        const style = `font-family: ${font};`;
        if (node) {
          applyMarkToNamedNodes(editor, node, 'customStyle', { style });
        } else {
          editor.chain().focus().setMark('customStyle', { style }).run();
        }
      },

      setFontSize: (size) => {
        const node = resolveTargetNodeName();
        const style = `font-size: ${size}px;`;
        if (node) {
          applyMarkToNamedNodes(editor, node, 'customStyle', { style });
        } else {
          editor.chain().focus().setMark('customStyle', { style }).run();
        }
      },

    };

    return () => {
      editor.destroy();
    };
  }, [enableEditor]);

  useEffect(() => {
    if (!data) return
    console.log('data update')
    const editor = editorRef.current;
    if (!editor) return;
    const key = `${data.translation}_${data.book}_${data.chapter}`;
    if (localStorage.masks[key])
      console.log('localStorage.masks[key]', localStorage.masks[key])
    editor.commands.setContent(htmlString);
  }, [data])

  // Toolbar items array for easy management
  const toolbarItems = [
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.bold(),
      icon: 'format_bold',
      title: 'Bold'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.italic(),
      icon: 'format_italic',
      title: 'Italic'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.underline(),
      icon: 'format_underlined',
      title: 'Underline'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.strikethrough(),
      icon: 'format_strikethrough',
      title: 'Strikethrough'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.superscript(),
      icon: 'superscript',
      title: 'Superscript'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.subscript(),
      icon: 'subscript',
      title: 'Subscript'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.aiHighlight(),
      icon: 'auto_fix_high',
      title: 'AI Highlight'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.alignLeft(),
      icon: 'format_align_left',
      title: 'Align Left'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.alignCenter(),
      icon: 'format_align_center',
      title: 'Center Align'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.alignRight(),
      icon: 'format_align_right',
      title: 'Align Right'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.alignJustify(),
      icon: 'format_align_justify',
      title: 'Justify'
    },
    {
      type: 'color-group',
      label: 'A',
      title: 'Text Color',
      value: textColor,
      onChange: (e) => {
        setTextColor(e.target.value);
        globalThis.EditorFns.setTextColor(e.target.value);
      }
    },
    {
      type: 'color-group',
      label: 'H',
      title: 'Highlight',
      value: bgColor,
      onChange: (e) => {
        setBgColor(e.target.value);
        globalThis.EditorFns.setHighlightColor(e.target.value);
      }
    },
    {
      type: 'select',
      title: 'Paragraph Style',
      onChange: (e) => changeBlockFormat(e.target.value),
      options: [
        { value: 'p', label: 'Paragraph' },
        { value: 'h1', label: 'Heading 1' },
        { value: 'h2', label: 'Heading 2' },
        { value: 'h3', label: 'Heading 3' },
        { value: 'blockquote', label: 'Quote' }
      ]
    },
    {
      type: 'select',
      title: 'Font Family',
      onChange: (e) => globalThis.EditorFns.setFontFamily(e.target.value),
      options: [
        { value: 'Arial', label: 'Arial' },
        { value: 'Times New Roman', label: 'Times New Roman' },
        { value: 'Courier New', label: 'Courier New' },
        { value: 'Georgia', label: 'Georgia' },
        { value: 'Verdana', label: 'Verdana' }
      ]
    },
    {
      type: 'select',
      title: 'Font Size',
      onChange: (e) => globalThis.EditorFns.setFontSize(e.target.value),
      options: [
        { value: '1', label: 'Tiny' },
        { value: '2', label: 'Small' },
        { value: '3', label: 'Normal', selected: true },
        { value: '4', label: 'Large' },
        { value: '5', label: 'X-Large' },
        { value: '6', label: 'Huge' }
      ]
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.undo(),
      icon: 'undo',
      title: 'Undo'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.redo(),
      icon: 'redo',
      title: 'Redo'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.clear(),
      icon: 'format_clear',
      title: 'Clear Formatting'
    },
    {
      type: 'button',
      onClick: () => globalThis.EditorFns.exportJson(),
      icon: 'file_download',
      title: 'Export JSON'
    },
    {
      type: 'button',
      onClick: () => uploadFile(),
      icon: 'upload_file',
      title: 'Import JSON'
    }
  ];

  const renderToolbarItem = (item, index) => {
    if (item.type === 'button') {
      return (
        <button key={index} style={iconBtnStyle} onClick={item.onClick} title={item.title}>
          <span className="material-symbols-outlined">{item.icon}</span>
        </button>
      );
    } else if (item.type === 'color-group') {
      return (
        <div key={index} style={colorGroupStyle}>
          <label style={labelStyle} title={item.title}>{item.label}</label>
          <input
            type="color"
            value={item.value}
            onChange={item.onChange}
            style={colorInputStyle}
          />
        </div>
      );
    } else if (item.type === 'select') {
      return (
        <select key={index} style={dropdownStyle} onChange={item.onChange} title={item.title}>
          {item.options.map((option, optIndex) => (
            <option key={optIndex} value={option.value} selected={option.selected}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
  };

  return (
    <>
      <div style={{ display: !enableEditor ? "" : "none" }}>{content}</div>
      {enableEditor && content && (
        <>
          {null/*
            toolbarItems.map((item, index) => renderToolbarItem(item, index))
            */}

          {null/*(hiddenItems.length > 0 || showAllItems) && <button
              className="toolbar-toggle-btn"
              style={{
                ...iconBtnStyle,
                backgroundColor: showAllItems ? '#e3f2fd' : 'transparent',
                color: showAllItems ? '#1976d2' : '#333'
              }}
              onClick={toggleShowAllItems}
              title={showAllItems ? 'Hide overflow items' : 'Show all items'}
            >
              <span className="material-symbols-outlined">
                {showAllItems ? 'visibility_off' : 'visibility'}
              </span>
            </button>*/}
          {null/*
            {hiddenItems.length > 0 && <div className="toolbar-controls" style={controlsStyle}>

              !showAllItems && hiddenItems.length > 0 && (
                <div style={{ position: 'static' }}>
                  <button
                    className="toolbar-toggle-btn"
                    style={iconBtnStyle}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    title="More options"
                  >
                    <span className="material-symbols-outlined">
                      {isMenuOpen ? 'keyboard_arrow_up' : 'more_vert'}
                    </span>
                  </button>

                  {isMenuOpen && (
                    <div className="toolbar-dropdown-menu" style={dropdownMenuStyle}>
                      <div style={dropdownHeaderStyle}>
                        Hidden Items ({hiddenItems.length})
                      </div>
                      {hiddenItems.map(itemIndex => (
                        <div key={itemIndex} style={dropdownItemStyle}>
                          {renderToolbarItem(toolbarItems[itemIndex], itemIndex)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            </div>}
              */}

          <ResponsiveToolbar editor={editorRef.current} />
          <style>{styles}</style>
          <div
            style={{ padding: `${paddingX}px ${paddingY}px` }}
            ref={editorRef}
            style={editorStyle}
            id="tiptapEditor"
          />
        </>
      )}
    </>
  )
};

// Responsive Styles
const editorContainerStyle = {
  maxWidth: '100%',
  margin: '20px auto',
  border: '1px solid #ccc',
  fontFamily: 'Arial, sans-serif',
  background: 'white',
  borderRadius: '8px',
  overflow: 'hidden',
};

const toolbarStyle = {
  background: '#f8f9fa',
  padding: '12px',
  borderBottom: '1px solid #e0e0e0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  overflow: 'hidden',
  position: 'relative',
};

const iconBtnStyle = {
  padding: '8px',
  fontSize: '18px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: '#333',
  borderRadius: '4px',
  minWidth: '36px',
  minHeight: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s, color 0.2s',
  flexShrink: 0,
};

const colorGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  flexShrink: 0,
};

const labelStyle = {
  fontSize: '12px',
  color: '#555',
  fontWeight: 'bold',
  marginRight: '2px',
};

const colorInputStyle = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  // border: '2px solid #dee2e6',
  border: 'none',
  outline: 'none',
  cursor: 'pointer',
  padding: '0',
};

const dropdownStyle = {
  height: '36px',
  fontSize: '14px',
  padding: '4px 8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  backgroundColor: 'white',
  minWidth: '80px',
  maxWidth: '120px',
  flexShrink: 1,
};

const controlsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  marginLeft: 'auto',
  flexShrink: 0,
};

const dropdownMenuStyle = {
  position: 'absolute',
  top: '100%',
  right: '0',
  background: 'white',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  zIndex: 1000,
  minWidth: '200px',
  maxHeight: '300px',
  overflowY: 'auto',
  padding: '8px',
};

const dropdownHeaderStyle = {
  padding: '8px 12px',
  background: '#f8f9fa',
  borderBottom: '1px solid #e0e0e0',
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#666',
  marginBottom: '4px',
  borderRadius: '4px',
};

const dropdownItemStyle = {
  padding: '4px 0',
  borderBottom: '1px solid #eee',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const editorStyle = {
  minHeight: '300px',
  padding: '15px',
  outline: 'none',
  lineHeight: '1.6',
  fontSize: '16px',
};


const alignmentOptions = [
  { label: 'Justify', icon: 'format_align_justify', value: 'justify' },
  { label: 'Left', icon: 'format_align_left', value: 'left' },
  { label: 'Center', icon: 'format_align_center', value: 'center' },
  { label: 'Right', icon: 'format_align_right', value: 'right' }
]

const listOption = [
  { label: 'Bulleted', icon: 'format_list_bulleted', value: 'bulleted' },
  { label: 'Numbered', icon: 'format_list_numbered', value: 'numbered' }
]
const iconButtonStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer'
}
export function ResponsiveToolbar({ editor }) {
  const [visibleItems, setVisibleItems] = useState([]);
  const [overflowItems, setOverflowItems] = useState([]);
  const [showOverflow, setShowOverflow] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [margin, setMargin] = useState(12);
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [selectedText, setSelectedText] = useState('all');
  useEffect(() => {
    globalThis.EditorTextMode = selectedText;
  }, [selectedText]);

  const toolbarRef = useRef(null);
  const itemsRef = useRef([]);

  // Alignment options
  const alignmentOptions = [
    { label: 'Left', icon: 'format_align_left', value: 'left' },
    { label: 'Center', icon: 'format_align_center', value: 'center' },
    { label: 'Right', icon: 'format_align_right', value: 'right' },
    { label: 'Justify', icon: 'format_align_justify', value: 'justify' }
  ];

  const listOptions = [
    { label: 'Bulleted', icon: 'format_list_bulleted', value: 'bulletList' },
    { label: 'Numbered', icon: 'format_list_numbered', value: 'orderedList' }
  ];
  const spacingOption = [
    { label: '1', icon: null, value: '1' },
    { label: '2', icon: null, value: '2' },
    { label: '3', icon: null, value: '3' },
    { label: '4', icon: null, value: '4' }
  ];

  // Handler functions
  const handleTextColorChange = (color) => {
    setTextColor(color);
    globalThis.EditorFns?.setTextColor(color);
  };

  const handleBgColorChange = (color) => {
    setBgColor(color);
    globalThis.EditorFns?.setHighlightColor(color);
  };

  const handleFontSizeChange = (size) => {
    os.log(size, 'size')
    setFontSize(size);
    globalThis.EditorFns?.setFontSize(size.toString());
  };

  const handleParagraphChange = (value) => {
    if (value === 'p') {
      globalThis.EditorFns?.setParagraph?.();
    } else if (['h1', 'h2', 'h3'].includes(value)) {
      const level = parseInt(value.replace('h', ''), 10);
      globalThis.EditorFns?.setHeading?.(level);
    }
  };

  const handleFontFamilyChange = (font) => {
    globalThis.EditorFns?.setFontFamily(font);
  };

  const handleAlignmentSelect = (option) => {
    switch (option.value) {
      case 'left':
        globalThis.EditorFns?.alignLeft();
        break;
      case 'center':
        globalThis.EditorFns?.alignCenter();
        break;
      case 'right':
        globalThis.EditorFns?.alignRight();
        break;
      case 'justify':
        globalThis.EditorFns?.alignJustify();
        break;
    }
  };

  const handleListSelect = (option) => {
    if (option.value === 'bulletList') {
      globalThis.EditorFns?.toggleBulletList?.();
    } else if (option.value === 'orderedList') {
      globalThis.EditorFns?.toggleOrderedList?.();
    }
  };
  const [spacing, setSpacing] = useState()
  const handleSpaceSelect = (option) => {
    console.log('spacing', option)
    // setSpacing(option)
    setSpacing(option)
    globalThis.EditorFns?.setLineHeight(option)

    // if (option.value === '1') {
    //   globalThis.EditorFns?.toggleBulletList?.();
    // } else if (option.value === '2') {
    //   globalThis.EditorFns?.toggleOrderedList?.();
    // }
  };

  const handleAIPrompt = async (prompt) => {
    globalThis.EditorFns?.aiHighlight?.(prompt);
  };

  // All toolbar items
  const allItems = [
    {
      id: 'text-select',
      type: 'component',
      component: (
        <TextSelect
          key="text-select"
          selectedText={selectedText}
          onTextSelect={setSelectedText}
        />
      )
    },
    {
      id: 'bold',
      type: 'icon',
      component: (
        <button
          key="bold"
          onClick={() => globalThis.EditorFns?.bold()}
          style={iconButtonStyle}
          title="Bold"
        >
          <span className="material-symbols-outlined">format_bold</span>
        </button>
      )
    },
    {
      id: 'italic',
      type: 'icon',
      component: (
        <button
          key="italic"
          onClick={() => globalThis.EditorFns?.italic()}
          style={iconButtonStyle}
          title="Italic"
        >
          <span className="material-symbols-outlined">format_italic</span>
        </button>
      )
    },
    {
      id: 'underline',
      type: 'icon',
      component: (
        <button
          key="underline"
          onClick={() => globalThis.EditorFns?.underline()}
          style={iconButtonStyle}
          title="Underline"
        >
          <span className="material-symbols-outlined">format_underlined</span>
        </button>
      )
    },
    {
      id: 'strikethrough',
      type: 'icon',
      component: (
        <button
          key="strikethrough"
          onClick={() => globalThis.EditorFns?.strikethrough()}
          style={iconButtonStyle}
          title="Strikethrough"
        >
          <span className="material-symbols-outlined">format_strikethrough</span>
        </button>
      )
    },
    {
      id: 'superscript',
      type: 'icon',
      component: (
        <button
          key="superscript"
          onClick={() => globalThis.EditorFns?.superscript()}
          style={iconButtonStyle}
          title="Superscript"
        >
          <span className="material-symbols-outlined">superscript</span>
        </button>
      )
    },
    {
      id: 'subscript',
      type: 'icon',
      component: (
        <button
          key="subscript"
          onClick={() => globalThis.EditorFns?.subscript()}
          style={iconButtonStyle}
          title="Subscript"
        >
          <span className="material-symbols-outlined">subscript</span>
        </button>
      )
    },
    {
      id: 'divider1',
      type: 'divider',
      component: <div key="divider1" className="horizontalLine"></div>
    },
    {
      id: 'align',
      type: 'dropdown',
      component: (
        <CustomDropdown
          key="align"
          options={alignmentOptions}
          onSelect={handleAlignmentSelect}
          defaultValue={alignmentOptions[0]}
        />
      )
    },
    {
      id: 'list',
      type: 'dropdown',
      component: (
        <CustomDropdown
          key="list"
          options={listOptions}
          onSelect={handleListSelect}
          defaultValue={listOptions[0]}
        />
      )
    },
    {
      id: 'line-spacing',
      type: 'icon',
      component: (
        <InputWithIcon
          key="margin"
          icon={<span class="material-symbols-outlined">
            format_line_spacing
          </span>}
          value={spacing}
          onChange={handleSpaceSelect}
          placeholder="12"
        />
      )
    },
    {
      id: 'divider2',
      type: 'divider',
      component: <div key="divider2" className="horizontalLine"></div>
    },


    {
      id: 'divider3',
      type: 'divider',
      component: <div key="divider3" className="horizontalLine"></div>
    },
    {
      id: 'attach',
      type: 'icon',
      component: (
        <button
          key="attach"
          onClick={() => uploadAttachmentAndInsert()}
          style={iconButtonStyle}
          title="Attach File"
        >
          <span className="material-symbols-outlined">attach_file</span>
        </button>
      )
    },
    {
      id: 'image',
      type: 'icon',
      component: (
        <button
          key="image"
          onClick={() => uploadImageAndInsert()}
          style={iconButtonStyle}
          title="Insert Image"
        >
          <span className="material-symbols-outlined">image</span>
        </button>
      )
    },
    {
      id: 'divider4',
      type: 'divider',
      component: <div key="divider4" className="horizontalLine"></div>
    },
    {
      id: 'text-color',
      type: 'color',
      component: (
        <div key="text-color" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span key="title" className="material-symbols-outlined ">
            title
          </span>
          <input
            type="color"
            value={textColor}
            onChange={(e) => handleTextColorChange(e.target.value)}
            style={colorInputStyle}
            title="Text Color"
          />
        </div>
      )
    },
    {
      id: 'bg-color',
      type: 'color',
      component: (
        <div key="bg-color" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>border_color</span>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => handleBgColorChange(e.target.value)}
            style={colorInputStyle}
            title="Highlight Color"
          />
        </div>
      )
    },
    {
      id: 'divider5',
      type: 'divider',
      component: <div key="divider5" className="horizontalLine"></div>
    },
    {
      id: 'paragraph',
      type: 'component',
      component: (
        <ParagraphSelect
          key="paragraph"
          onParagraphChange={globalThis.EditorFns?.onParagraphChange}
        />
      )
    },

    {
      id: 'font-family',
      type: 'component',
      component: (
        <FontFamilySelect
          key="font-family"
          onFontFamilyChange={handleFontFamilyChange}
        />
      )
    },
    {
      id: 'font-style',
      type: 'component',
      component: (
        <FontStyleSelect
          key="font-family"
          onFontStyleChange={globalThis.EditorFns?.onFontStyleChange}
        />
      )
    },
    {
      id: 'font-size',
      type: 'component',
      component: (
        <Counter
          key="font-size"
          value={fontSize}
          onChange={handleFontSizeChange}
        />
      )
    },
    {
      id: 'undo',
      type: 'icon',
      component: (
        <button
          key="undo"
          onClick={() => globalThis.EditorFns?.undo()}
          style={iconButtonStyle}
          title="Undo"
        >
          <span className="material-symbols-outlined">undo</span>
        </button>
      )
    },
    {
      id: 'redo',
      type: 'icon',
      component: (
        <button
          key="redo"
          onClick={() => globalThis.EditorFns?.redo()}
          style={iconButtonStyle}
          title="Redo"
        >
          <span className="material-symbols-outlined">redo</span>
        </button>
      )
    },
    {
      id: 'clear',
      type: 'icon',
      component: (
        <button
          key="clear"
          onClick={() => globalThis.EditorFns?.clear()}
          style={iconButtonStyle}
          title="Clear Formatting"
        >
          <span className="material-symbols-outlined">format_clear</span>
        </button>
      )
    },
    {
      id: 'print',
      type: 'icon',
      component: (
        <button
          key="print"
          onClick={() => window.print()}
          style={iconButtonStyle}
          title="Print"
        >
          <span className="material-symbols-outlined">print</span>
        </button>
      )
    },

    {
      id: 'margin1',
      type: 'component',
      component: (
        <InputWithIcon
          key="margin1"
          icon={<MarginYIcon />}
          value={margin}
          onChange={(val) => {
            // setPaddingY(val);
            document.getElementById("tiptapEditor").style.paddingTop = `${val}px`;
            document.getElementById("tiptapEditor").style.paddingBottom = `${val}px`;
          }}
          placeholder="Vertical"
        />
      )
    },
    {
      id: 'margin2',
      type: 'component',
      component: (
        <InputWithIcon
          key="margin2"
          icon={<MarginXIcon />}
          value={margin}
          onChange={(val) => {
            // setPaddingX(val);
            document.getElementById("tiptapEditor").style.paddingLeft = `${val}px`;
            document.getElementById("tiptapEditor").style.paddingRight = `${val}px`;
          }}
          placeholder="Horizontal"
        />
      )
    },
    {
      id: 'divider6',
      type: 'divider',
      component: <div key="divider6" className="horizontalLine"></div>
    },
    {
      id: 'ai-prompt',
      type: 'component',
      component: (
        <AIPromptInput
          key="ai-prompt"
          onAIPrompt={handleAIPrompt}
        />
      )
    },
    {
      id: 'divider7',
      type: 'divider',
      component: <div key="divider7" className="horizontalLine"></div>
    },
    {
      id: 'download',
      type: 'icon',
      component: (
        <button
          key="download"
          onClick={() => globalThis.EditorFns?.exportJson()}
          style={iconButtonStyle}
          title="Download"
        >
          <span className="material-symbols-outlined">file_download</span>
        </button>
      )
    },
    {
      id: 'upload',
      type: 'icon',
      component: (
        <button
          key="upload"
          onClick={() => uploadFile()}
          style={iconButtonStyle}
          title="Upload"
        >
          <span className="material-symbols-outlined">upload_file</span>
        </button>
      )
    }
  ];


  const calculateVisibleItems = () => {
    if (!toolbarRef.current) return;

    const toolbar = toolbarRef.current;
    const toolbarWidth = toolbar.offsetWidth;
    const overflowBtnWidth = 50;
    const availableWidth = toolbarWidth - overflowBtnWidth;

    let usedWidth = 0;
    const visible = [];
    const overflow = [];

    allItems.forEach((item, i) => {
      const el = itemsRef.current[i];
      if (!el) return;

      const itemWidth = el.offsetWidth + 20;

      if (usedWidth + itemWidth <= availableWidth) {
        visible.push(item);
        usedWidth += itemWidth;
      } else {
        overflow.push(item);
      }
    });

    setVisibleItems(visible);
    setOverflowItems(overflow);
  };

  useEffect(() => {
    setTimeout(() => {
      calculateVisibleItems()
    }, 150)

    const handleResize = () => {
      calculateVisibleItems()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      <div className="tiptapToolbar" ref={toolbarRef}>
        <div className="toolbar-measurer">
          {allItems.map((item, index) => (
            <div key={`measurer-${item.id}`} ref={(el) => (itemsRef.current[index] = el)} className="toolbar-item-measurer">
              {item.component}
            </div>
          ))}
        </div>

        {visibleItems.map((item) => (
          <div key={`visible-${item.id}`} className="toolbar-item">
            {item.component}
          </div>
        ))}
        {overflowItems.length > 0 && (
          <div className="toolbar-item">
            <button className="overflow-button" onClick={() => setShowOverflow(!showOverflow)}>
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        )}
        {showOverflow &&
          overflowItems.map((item) => (
            <div key={`visible-${item.id}`} className="toolbar-item">
              {item.component}
            </div>
          ))}

      </div>
    </>
  )
}

// Responsive Toolbar Components
function TextSelect({ selectedText, onTextSelect }) {
  return (
    <select
      className="textToEdit"
      value={selectedText || 'all'}
      onChange={(e) => onTextSelect(e.target.value)}
      style={{
        padding: '6px 8px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        fontSize: '14px',
        minWidth: '80px'
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
        width: '50px',
        height: '30px',
        color: '#5F5E5C',
        border: '1px solid #ccc',
        outline: 'none',
        borderRadius: '6px',
        fontSize: '12px'
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
  const fonts = ['DM Sans', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];

  return (
    <select
      onChange={(e) => onFontFamilyChange(e.target.value)}
      style={{
        width: '90px',
        height: '30px',
        color: '#5F5E5C',
        border: '1px solid #ccc',
        outline: 'none',
        borderRadius: '6px',
        fontSize: '12px'
      }}
    >
      {fonts.map(font => (
        <option key={font} value={font}>{font}</option>
      ))}
    </select>
  );
}

function FontStyleSelect({ onFontStyleChange }) {
  return (
    <select
      onChange={(e) => onFontStyleChange(e.target.value)}
      style={{
        width: '70px',
        height: '30px',
        color: '#5F5E5C',
        border: '1px solid #ccc',
        outline: 'none',
        borderRadius: '6px',
        fontSize: '12px'
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
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    // if (inputValue.trim()) {
    onAIPrompt(inputValue);
    setInputValue('');
    // }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f3f4f6',
      borderRadius: '24px',
      padding: '2px',
      minWidth: '200px',
      gap: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'all 0.2s ease',
      border: 'none',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="AI Prompt..."
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#374151',
          fontSize: '14px',
          fontWeight: '400',
          letterSpacing: '-0.01em',
          lineHeight: '1.2',
          flex: 1,
          fontFamily: 'inherit',
          padding: '8px 12px'
        }}
      />
      <div
        onClick={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          backgroundColor: '#f9d5cc',
          borderRadius: '50%',
          flexShrink: 0,
          cursor: 'pointer'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#8b4513' }}>
          <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" fill="currentColor" />
          <path d="M12 1L12.75 3.25L15 4L12.75 4.75L12 7L11.25 4.75L9 4L11.25 3.25L12 1Z" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

function Counter({ value, onChange, min = 8, max = 72 }) {
  const [fontSize, setFontSize] = useState(16)
  const increment = () => {
    if (value < max) {
      let size = fontSize + 1
      setFontSize(size);
      globalThis.EditorFns?.setFontSize(size.toString());
    };
  };

  const decrement = () => {
    if (value > min) {
      let size = fontSize - 1
      setFontSize(size);
      globalThis.EditorFns?.setFontSize(size.toString());
    };
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: '50px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #DADADA',
      padding: '2px'
    }}>
      <button
        onClick={decrement}
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '300'
        }}
      >
        −
      </button>
      <div style={{
        fontSize: '14px',
        fontWeight: '500',
        color: '#5F5E5C',
        minWidth: '40px',
        textAlign: 'center',
        userSelect: 'none'
      }}>
        {fontSize}
      </div>
      <button
        onClick={increment}
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '300'
        }}
      >
        +
      </button>
    </div>
  );
}

function InputWithIcon({ icon, value, onChange, placeholder = "" }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      border: '1px solid #ccc',
      borderRadius: '6px',
      backgroundColor: 'white',
      minWidth: '60px'
    }}>
      <div style={{ fontSize: '16px', color: '#666' }}>{icon}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        placeholder={placeholder}
        style={{
          border: 'none',
          outline: 'none',
          width: '40px',
          fontSize: '14px',
          textAlign: 'center'
        }}
      />
    </div>
  );
}

function CustomDropdown({ options = [], onSelect, label = 'Select', defaultValue }) {
  const [selected, setSelected] = useState(defaultValue || options[0]);
  const [open, setOpen] = useState(false);

  const handleSelect = (option) => {
    setSelected(option);
    setOpen(false);
    if (onSelect) onSelect(option);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 8px',
          // border: '1px solid #ccc',
          borderRadius: '6px',
          cursor: 'pointer',
          // backgroundColor: 'white',
          minWidth: '40px'
        }}
      >
        {selected?.icon && (
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {selected.icon}
          </span>
        )}
        <span className="material-symbols-outlined" style={{ fontSize: '16px', marginLeft: 'auto' }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '6px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          marginTop: '2px'
        }}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(option);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                borderBottom: '1px solid #eee'
              }}
            >
              {option.icon && (
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {option.icon}
                </span>
              )}
              {null/*<span>{option.label}</span>*/}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



const styles = `
.custom-color {
  margin-left: 0px;
  -webkit-appearance: none;
  border: 2px solid #444;
  width: 25px;
  height: 25px;
  cursor: pointer;
  padding: 0;
  border: none;
}

.custom-color::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

.custom-color::-moz-color-swatch {
  border: none;
  border-radius: 2px;
}
#tiptapEditor{
  padding:0px;
}
.tiptapToolbar {
  margin-top:-9px !important;
  width: 100%;
  /* height: 44px; */
  background-color:  var(--themeSideMenu);
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: start;
  padding: 0px 10px;
  gap: 20px;
  position: relative;
  overflow: visible;
  flex-wrap: wrap;
}

.toolbar-measurer {
  position: absolute;
  top: 0;
  left: -9999px;
  visibility: hidden;
  display: flex;
  gap: 20px;
  align-items: center;
  height: 44px;
  padding: 0px 10px;
}

.toolbar-item-measurer {
  display: flex;
  align-items: center;
}

.toolbar-item {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.toolbar-icon {
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.toolbar-icon:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.overflow-menu {
  position: relative;
  margin-left: auto;
}

.overflow-button {
    background: transparent;
    border: none;
    cursor: pointer;
    /* padding: 8px; */
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
    margin-left: -10px;
}

.overflow-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.overflow-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.overflow-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  margin: 2px 0;
  transition: background-color 0.2s ease;
}

.overflow-item:hover {
  background-color: #f5f5f5;
}

.textToEdit {
  width: 80px;
  height: 28px;
  border-radius: 30px;
  background-color: #d364334d;
  border: none;
  color: #5f5e5c;
  outline: none;
  padding: 5px;
}

.horizontalLine {
  height: 30px;
  width: 2px;
  background-color: #dcdcdc;
  margin: 10px 0;
}

.custom-dropdown-wrapper {
  width: fit-content;
  height: fit-content;
}

.custom-dropdown {
  position: relative;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
  width: 100%;
  transition: all 0.2s ease;
  background: transparent;
  outline: none;
  width: 39px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.custom-dropdown-selected {
  padding: 10px 12px;
  display: flex;
  align-items: center;
}

.custom-dropdown-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-top: none;
  z-index: 999;
  border-radius: 0 0 8px 8px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.08);
}

.custom-dropdown-option {
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
}

.custom-dropdown-option:hover {
  background-color: #f0f0f0;
}

.material-symbols-outlined {
  font-size: 20px;
}

.inputWithIcon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 70px;
  height: 24px;
  background-color: white;
  position: relative;
  overflow: hidden;
  padding: 15px;
  border-radius: 6px;
}

.inputWithIcon input {
  background: transparent;
  outline: none;
  border: none;
  position: absolute;
  z-index: 1000;
  width: 35px;
  right: 0;
}

.inputWithIcon span {
  position: absolute;
  left: 5px;
  top: 50%;
  transform: translateY(-50%);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .tiptapToolbar {
    gap: 10px;
    padding: 0px 5px;
  }

  .overflow-dropdown {
    right: -50px;
    min-width: 250px;
  }
}

@media (max-width: 480px) {
  .tiptapToolbar {
    gap: 5px;
    padding: 0px 3px;
  }

  .overflow-dropdown {
    right: -100px;
    min-width: 300px;
  }
}
`
export { TextEditor };