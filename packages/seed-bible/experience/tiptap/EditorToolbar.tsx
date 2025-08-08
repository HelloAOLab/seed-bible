import { useBibleContext } from 'app.hooks.bibleVariables'
const { useState, useEffect, useMemo, useCallback } = os.appHooks;

const App1 = () => {

    const [editor, setEditor] = useState(null);
    const [editorID, setEditorID] = useState(null);
    const [activeButtons, setActiveButtons] = useState({
        bold: false,
        italic: false,
        heading: false
    })

    useEffect(() => {
        if (EditorConfig && editorID !== EditorConfig.id) {
            EditorConfig.editor.setEditable(true);
            setEditor(EditorConfig.editor)
            setEditorID(EditorConfig.id)
        }
        const it = setInterval(() => {
            if (EditorConfig && editorID !== EditorConfig.id) {
                EditorConfig.editor.setEditable(true);
                setEditor(EditorConfig.editor)
                setEditorID(EditorConfig.id)
            }
        }, 300)
        return () => {
            EditorConfig.editor.setEditable(false);
            clearInterval(it)
        }
    }, [])

    useEffect(() => {
        globalThis.SetEditorToolbarButtons = setActiveButtons;
        return () => {
            globalThis.SetEditorToolbarButtons = null;
        }
    }, [])

    if (!editor) {
        return null
    }

    return (
        <div className="tiptap-toolbar">
        <button 
          className={`tiptap-toolbar-button ${activeButtons.bold ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="material-symbols-outlined">format_bold</span>
        </button>
        
        <button 
          className={`tiptap-toolbar-button ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="material-symbols-outlined">format_italic</span>
        </button>
        
        <button 
          className={`tiptap-toolbar-button ${editor.isActive('underline') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="material-symbols-outlined">format_underlined</span>
        </button>

        <button 
          className={`tiptap-toolbar-button ${editor.isActive('heading', {level: 1}) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <span className="material-symbols-outlined">format_h1</span>
        </button>

        <button 
          className={`tiptap-toolbar-button ${editor.isActive('heading', {level: 2}) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <span className="material-symbols-outlined">format_h2</span>
        </button>

        <button 
          className={`tiptap-toolbar-button ${editor.isActive('heading', {level: 3}) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <span className="material-symbols-outlined">format_h3</span>
        </button>

        <button 
          className={`tiptap-toolbar-button ${editor.isActive('highlight') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <span className="material-symbols-outlined">highlight</span>
        </button>

         <button 
          className={`tiptap-toolbar-button ${editor.isActive('blockquote') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <span className="material-symbols-outlined">format_quote</span>
        </button>
        
        <button 
          className={`tiptap-toolbar-button ${editor.isActive('strike') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="material-symbols-outlined">format_strikethrough</span>
        </button>
        <style>{tags["tiptap.css"]}</style>
      </div>
    )
}

return App1;