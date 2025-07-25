const { useEffect, useRef, useState } = os.appHooks
import { Editor } from 'https://esm.sh/@tiptap/core@next';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@next';
// import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@next';
import Color from 'https://esm.sh/@tiptap/extension-color@next';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@next';
import Underline from 'https://esm.sh/@tiptap/extension-underline@next';
import Superscript from 'https://esm.sh/@tiptap/extension-superscript@next';
import Subscript from 'https://esm.sh/@tiptap/extension-subscript@next';
import Highlight from 'https://esm.sh/@tiptap/extension-highlight@next';
import { TextStyle } from 'https://esm.sh/@tiptap/extension-text-style@next';

// const CustomStyle = Editor.Mark.create({
//   name: 'customStyle',
//   addAttributes() {
//     return {
//       style: {
//         default: null,
//         parseHTML: el => el.getAttribute('style'),
//         renderHTML: attrs => (attrs.style ? { style: attrs.style } : {}),
//       },
//     };
//   },
//   parseHTML() {
//     return [{ tag: 'span[style]' }];
//   },
//   renderHTML({ HTMLAttributes }) {
//     return ['span', HTMLAttributes, 0];
//   },
// });

function MiniTextEditor({ initialHtml = '', onChange }) {
    const editorRef = useRef(null);
    const [textColor, setTextColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#ffff00');

    useEffect(() => {
        const editor = new Editor({
            element: editorRef.current,
            content: initialHtml,
            extensions: [
                StarterKit,
                TextStyle,
                Color.configure({ types: ['textStyle'] }),
                TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'left' }),
                Underline,
                Superscript,
                Subscript,
                Highlight.configure({ multicolor: true }),
                // CustomStyle,
            ],
            onUpdate({ editor }) {
                onChange?.(editor.getHTML());
            },
        });
        editorRef.current.editor = editor;
        return () => editor.destroy();
    }, []);

    const exec = (cmd, arg) => {
        const ed = editorRef.current?.editor;
        if (!ed) return;
        ed.chain().focus()[cmd](arg).run();
    };

    return (
        <div
            style={{
                maxWidth: '100%',
                margin: '20px auto',
                border: '1px solid #ccc',
                fontFamily: 'Arial, sans-serif',
                background: 'white',
            }}
        >
            <div style={toolbarStyle}>
                <div style={toolbarGroupStyle}>
                    <button style={iconBtnStyle} onClick={() => exec('toggleBold')}>
                        <span className="material-symbols-outlined">format_bold</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('toggleItalic')}>
                        <span className="material-symbols-outlined">format_italic</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('toggleUnderline')}>
                        <span className="material-symbols-outlined">format_underlined</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('toggleStrike')}>
                        <span className="material-symbols-outlined">format_strikethrough</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('toggleSuperscript')}>
                        <span className="material-symbols-outlined">superscript</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('toggleSubscript')}>
                        <span className="material-symbols-outlined">subscript</span>
                    </button>
                </div>

                <div style={toolbarGroupStyle}>
                    <button style={iconBtnStyle} onClick={() => exec('setTextAlign', 'left')}>
                        <span className="material-symbols-outlined">format_align_left</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('setTextAlign', 'center')}>
                        <span className="material-symbols-outlined">format_align_center</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('setTextAlign', 'right')}>
                        <span className="material-symbols-outlined">format_align_right</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('setTextAlign', 'justify')}>
                        <span className="material-symbols-outlined">format_align_justify</span>
                    </button>
                </div>

                <div style={toolbarGroupStyle}>
                    <label style={labelStyle}>A</label>
                    <input
                        type="color"
                        value={textColor}
                        onChange={(e) => {
                            // setTextColor(e.target.value);
                            // setTextColor(color);
                            editorRef.current.editor.chain().focus().setColor(e.target.value).run()
                            // exec('setColor', e.target.value);
                        }}
                        style={circleColorInputStyle}
                    />
                    <label style={labelStyle}>H</label>
                    <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => {
                            // setBgColor(e.target.value);
                            // exec('setMark', 'highlight', { color: e.target.value });
                            editorRef.current.editor.chain().focus().setMark('highlight', { color: e.target.value }).run();
                        }}
                        style={circleColorInputStyle}
                    />
                </div>

                <div style={toolbarGroupStyle}>
                    <select
                        className="selectInput"
                        style={dropdownStyle}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'p') exec('setParagraph');
                            else if (val === 'blockquote') exec('toggleBlockquote');
                            else exec('toggleHeading', { level: parseInt(val.replace('h', '')) });
                        }}
                    >
                        <option value="p">Paragraph</option>
                        <option value="h1">Heading 1</option>
                        <option value="h2">Heading 2</option>
                        <option value="h3">Heading 3</option>
                        <option value="blockquote">Quote</option>
                    </select>

                    <select
                        style={dropdownStyle}
                        onChange={(e) => exec('setMark', 'customStyle', { style: `font-family: ${e.target.value};` })}
                    >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                    </select>

                    <select
                        style={dropdownStyle}
                        onChange={(e) => {
                            const map = { 1: '0.75em', 2: '0.875em', 3: '1em', 4: '1.25em', 5: '1.5em', 6: '2em' };
                            exec('setMark', 'customStyle', { style: `font-size: ${map[e.target.value] || '1em'}` });
                        }}
                    >
                        <option value="3">Normal</option>
                        <option value="1">Tiny</option>
                        <option value="4">Large</option>
                        <option value="6">Huge</option>
                    </select>
                </div>

                <div style={toolbarGroupStyle}>
                    <button style={iconBtnStyle} onClick={() => exec('undo')}>
                        <span className="material-symbols-outlined">undo</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('redo')}>
                        <span className="material-symbols-outlined">redo</span>
                    </button>
                    <button style={iconBtnStyle} onClick={() => exec('clearNodes') || exec('unsetAllMarks')}>
                        <span className="material-symbols-outlined">format_clear</span>
                    </button>
                </div>
            </div>

            <div
                ref={editorRef}
                style={{
                    minHeight: '200px',
                    padding: '15px',
                    outline: 'none',
                    lineHeight: '1.5',
                }}
            />
        </div>
    );
}

// Styles
const iconBtnStyle = {
    padding: '6px',
    fontSize: '18px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: '#333',
};

const toolbarGroupStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
};

const labelStyle = {
    fontSize: '14px',
    color: '#555',
    fontWeight: 'bold',
    marginRight: '4px',
};

const circleColorInputStyle = {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
};

const dropdownStyle = {
    height: '30px',
    fontSize: '14px',
    padding: '2px 6px',
    border: '1px solid #ccc',
    borderRadius: '4px',
};

const toolbarStyle = {
    background: '#f0f0f0',
    padding: '12px',
    borderBottom: '1px solid #ccc',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'space-between',
};
export { MiniTextEditor }