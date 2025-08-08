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
        if (globalThis?.EditorConfig && editorID !== globalThis?.EditorConfig.id) {
            globalThis?.EditorConfig.editor.setEditable(true);
            setEditor(globalThis?.EditorConfig.editor)
            setEditorID(globalThis?.EditorConfig.id)
        }
        const it = setInterval(() => {
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
        globalThis.SetActiveButtons = setActiveButtons;
        return () => {
            globalThis.SetActiveButtons = null;
        }
    }, [])

    if (!editor) {
        return <>Initialize Editor</>
    }

    return (
        <div class="control-group">
            <span class="material-symbols-outlined" onClick={() => {
                if (globalThis.tiptapToolApp) {
                    RemoveApplicationByID(globalThis.TIPTAP_PANEL_ID);
                    globalThis.TIPTAP_PANEL_ID = null;
                    globalThis.tiptapToolApp = false;
                    return;
                }
            }}>close</span>
            <div class="button-group">
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleStrike()
                            .run()
                    }
                    class={editor.isActive('strike') ? 'is-active' : ''}
                >
                    Strike
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleCode()
                            .run()
                    }
                    class={editor.isActive('code') ? 'is-active' : ''}
                >
                    Code
                </button>
                <button onClick={() => editor.chain().focus().unsetAllMarks().run()}>
                    Clear marks
                </button>
                <button onClick={() => editor.chain().focus().clearNodes().run()}>
                    Clear nodes
                </button>
                <button
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    class={editor.isActive('paragraph') ? 'is-active' : ''}
                >
                    Paragraph
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    class={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                >
                    H1
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    class={activeButtons.heading ? 'is-active' : ''}
                >
                    H2
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    class={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                >
                    H3
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                    class={editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}
                >
                    H4
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
                    class={editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}
                >
                    H5
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
                    class={editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}
                >
                    H6
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    class={editor.isActive('bulletList') ? 'is-active' : ''}
                >
                    Bullet list
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    class={editor.isActive('orderedList') ? 'is-active' : ''}
                >
                    Ordered list
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    class={editor.isActive('codeBlock') ? 'is-active' : ''}
                >
                    Code block
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    class={editor.isActive('blockquote') ? 'is-active' : ''}
                >
                    Blockquote
                </button>
                <button onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                    Horizontal rule
                </button>
                <button onClick={() => editor.chain().focus().setHardBreak().run()}>
                    Hard break
                </button>
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                // disabled={
                //     !editor.can()
                //         .chain()
                //         .focus()
                //         .undo()
                //         .run()
                // }
                >
                    Undo
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                // disabled={
                //     !editor.can()
                //         .chain()
                //         .focus()
                //         .redo()
                //         .run()
                // }
                >
                    Redo
                </button>
                <button
                    onClick={() => editor.chain().focus().setColor('#958DF1').run()}
                    class={editor.isActive('textStyle', { color: '#958DF1' }) ? 'is-active' : ''}
                >
                    Purple
                </button>
            </div>
            <style>{tags["tiptap.css"]}</style>
        </div>
    )
}

return App1;