const { useEffect, useState, useRef } = os.appHooks;

const TextEditor = ({ content,tab }) => {
  if(!tab)
  return content
  const editorRef = useRef(null);
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [enableEditor, setEnableEditor] = useState(false);

  globalThis[`SetEnableEditorOf${tab.id}`] = setEnableEditor;

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const changeBlockFormat = (value) => {
    formatText('formatBlock', value);
  };

  useEffect(() => {
    globalThis.EditorFns = {
      bold: () => formatText('bold'),
      italic: () => formatText('italic'),
      underline: () => formatText('underline'),
      strikethrough: () => formatText('strikeThrough'),
      superscript: () => formatText('superscript'),
      subscript: () => formatText('subscript'),
      alignLeft: () => formatText('justifyLeft'),
      alignCenter: () => formatText('justifyCenter'),
      alignRight: () => formatText('justifyRight'),
      alignJustify: () => formatText('justifyFull'),
      undo: () => formatText('undo'),
      redo: () => formatText('redo'),
      clear: () => formatText('removeFormat'),
      setTextColor: (color) => {
        setTextColor(color);
        formatText('foreColor', color);
      },
      setHighlightColor: (color) => {
        setBgColor(color);
        formatText('hiliteColor', color);
      },
      setParagraphType: changeBlockFormat,
      getHtml: () => editorRef.current?.innerHTML || '',
      setHtml: (html) => {
        if (editorRef.current) editorRef.current.innerHTML = html;
      },
    };
  }, []);

  if (!enableEditor) return <div>{content}</div>;

  return (
    <div
      style={{
        maxWidth: '100%',
        margin: '20px auto',
        border: '1px solid #ccc',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          background: '#f0f0f0',
          padding: '12px',
          borderBottom: '1px solid #ccc',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between',
        }}
      >
        <div style={toolbarGroupStyle}>
          <button style={iconBtnStyle} onClick={() => formatText('bold')} title="Bold">
            <span className="material-symbols-outlined">format_bold</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('italic')} title="Italic">
            <span className="material-symbols-outlined">format_italic</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('underline')} title="Underline">
            <span className="material-symbols-outlined">format_underlined</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('strikeThrough')} title="Strikethrough">
            <span className="material-symbols-outlined">format_strikethrough</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('superscript')} title="Superscript">
            <span className="material-symbols-outlined">superscript</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('subscript')} title="Subscript">
            <span className="material-symbols-outlined">subscript</span>
          </button>
        </div>

        <div style={toolbarGroupStyle}>
          <button style={iconBtnStyle} onClick={() => formatText('justifyLeft')} title="Align Left">
            <span className="material-symbols-outlined">format_align_left</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('justifyCenter')} title="Center Align">
            <span className="material-symbols-outlined">format_align_center</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('justifyRight')} title="Align Right">
            <span className="material-symbols-outlined">format_align_right</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('justifyFull')} title="Justify">
            <span className="material-symbols-outlined">format_align_justify</span>
          </button>
        </div>

        <div style={toolbarGroupStyle}>
          <label style={labelStyle} title="Text Color">A</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => {
              setTextColor(e.target.value);
              formatText('foreColor', e.target.value);
            }}
            style={circleColorInputStyle}
          />
          <label style={labelStyle} title="Highlight">H</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => {
              setBgColor(e.target.value);
              formatText('hiliteColor', e.target.value);
            }}
            style={circleColorInputStyle}
          />
        </div>

        <div style={toolbarGroupStyle}>
          <select className="selectInput" style={dropdownStyle} onChange={(e) => changeBlockFormat(e.target.value)} title="Paragraph Style">
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Quote</option>
          </select>

          <select className="selectInput" style={dropdownStyle} onChange={(e) => formatText('fontName', e.target.value)} title="Font Family">
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>

          <select className="selectInput" style={dropdownStyle} onChange={(e) => formatText('fontSize', e.target.value)} title="Font Size">
            <option value="1">Tiny</option>
            <option value="2">Small</option>
            <option value="3" selected>Normal</option>
            <option value="4">Large</option>
            <option value="5">X-Large</option>
            <option value="6">Huge</option>
          </select>
        </div>

        <div style={toolbarGroupStyle}>
          <button style={iconBtnStyle} onClick={() => formatText('undo')} title="Undo">
            <span className="material-symbols-outlined">undo</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('redo')} title="Redo">
            <span className="material-symbols-outlined">redo</span>
          </button>
          <button style={iconBtnStyle} onClick={() => formatText('removeFormat')} title="Clear Formatting">
            <span className="material-symbols-outlined">format_clear</span>
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        style={{
          minHeight: '300px',
          padding: '15px',
          outline: 'none',
          lineHeight: '1.5',
        }}
      >
        {content}
      </div>
    </div>
  );
};

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

export { TextEditor };
