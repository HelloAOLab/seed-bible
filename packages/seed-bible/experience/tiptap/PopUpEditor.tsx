const { useState, useEffect, useMemo, useCallback } = os.appHooks;

const App1 = () => {

    const [editor, setEditor] = useState(null);
    const [editorID, setEditorID] = useState(null);
    const [popUpActiveButtons, setPopUpActiveButtons] = useState({
        bold: false,
        italic: false,
        heading: false
    })

    useEffect(() => {
        if (globalThis?.EditorConfig && editorID !== globalThis?.EditorConfig.id) {
                globalThis?.EditorConfig.editor.setEditable(true);
                setEditor(globalThis?.EditorConfig.editor)
                setEditorID(globalThis?.EditorConfig.id)
            }
        let it = setInterval(() => {
            if (globalThis?.EditorConfig && editorID !== globalThis?.EditorConfig.id) {
                globalThis?.EditorConfig.editor.setEditable(true);
                setEditor(globalThis?.EditorConfig.editor)
                setEditorID(globalThis?.EditorConfig.id)
            }
        }, 300)
        return () => {
            globalThis?.EditorConfig.editor.setEditable(false);
            clearInterval(it)
        }
    }, [])

    useEffect(() => {
        globalThis.SetPopUpActiveButtons = setPopUpActiveButtons;
        return () => {
            globalThis.SetPopUpActiveButtons = null;
        }
    }, [])

    if (!editor) {
        return null
    }

    return <>
        <div class="popup-button-group">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleBold()
                            .run()
                    }
                    class={popUpActiveButtons.bold ? 'is-active material-symbols-outlined' : 'material-symbols-outlined'}
                >
                    format_bold
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleItalic()
                            .run()
                    }
                    class={editor.isActive('italic') ? 'is-active material-symbols-outlined' : 'material-symbols-outlined'}
                >
                    format_italic
                </button>
            </div>
            <style>{tags["tiptap.css"]}</style>
    </>
}

return App1;