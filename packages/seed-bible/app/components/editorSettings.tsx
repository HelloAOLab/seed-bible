const { useEffect, useState } = os.appHooks;
import { MenuIcon, ToolbarIcon } from 'app.components.icons';
import { useTabsContext } from 'app.hooks.tabs';
import { useSideBarContext } from 'app.hooks.sideBar';
import { useBibleContext } from 'app.hooks.bibleVariables';

const EditorToolbarSettings = () => {
    const { updateSpace, activeSpace, spaces } = useTabsContext();
    const { sidebarMode, setSideBarMode, closePopupSettings } = useSideBarContext();
    const { tools, setTools } = useBibleContext();

    const [priorities, setPriorities] = useState([]);
    useEffect(() => {
        globalThis.DEFAULT_TOOLBAR_PRIORITY = priorities
        if(priorities.length>0)
        globalThis.EditorToolbar.setPriorities(priorities)
    }, [priorities])
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [loading, setLoading] = useState(false);

    // Default toolbar items with their descriptions
    const defaultItems = [
        { id: 'text-select', label: 'Text Select', description: 'Choose which text to format (all, headings, verses)' },
        { id: 'bold', label: 'Bold', description: 'Make text bold' },
        { id: 'italic', label: 'Italic', description: 'Make text italic' },
        { id: 'underline', label: 'Underline', description: 'Underline text' },
        { id: 'strikethrough', label: 'Strikethrough', description: 'Strike through text' },
        { id: 'superscript', label: 'Superscript', description: 'Superscript text' },
        { id: 'subscript', label: 'Subscript', description: 'Subscript text' },
        { id: 'align', label: 'Alignment', description: 'Text alignment options' },
        { id: 'list', label: 'Lists', description: 'Bulleted and numbered lists' },
        { id: 'line-spacing', label: 'Line Spacing', description: 'Adjust line spacing' },
        { id: 'attach', label: 'Attach File', description: 'Attach files to document' },
        { id: 'image', label: 'Insert Image', description: 'Insert images' },
        { id: 'text-color', label: 'Text Color', description: 'Change text color' },
        { id: 'bg-color', label: 'Highlight Color', description: 'Change background/highlight color' },
        { id: 'paragraph', label: 'Paragraph', description: 'Paragraph and heading styles' },
        { id: 'font-family', label: 'Font Family', description: 'Choose font family' },
        { id: 'font-style', label: 'Font Style', description: 'Choose font style (normal, bold, italic, light)' },
        { id: 'font-size', label: 'Font Size', description: 'Adjust font size' },
        { id: 'undo', label: 'Undo', description: 'Undo last action' },
        { id: 'redo', label: 'Redo', description: 'Redo last action' },
        { id: 'clear', label: 'Clear Formatting', description: 'Clear all formatting' },
        { id: 'print', label: 'Print', description: 'Print document' },
        { id: 'margin1', label: 'Vertical Margin', description: 'Adjust vertical padding' },
        { id: 'margin2', label: 'Horizontal Margin', description: 'Adjust horizontal padding' },
        { id: 'ai-prompt', label: 'AI Prompt', description: 'AI-powered text enhancement' },
        { id: 'download', label: 'Download', description: 'Download document as JSON' },
        { id: 'upload', label: 'Upload', description: 'Upload JSON document' }
    ];

    // Load current priorities on mount
    useEffect(() => {
        try {
            if (globalThis.EditorToolbar && globalThis.EditorToolbar.getPriorities) {
                const currentPriorities = globalThis.EditorToolbar.getPriorities();
                setPriorities(currentPriorities);
            } else {
                // Fallback to default order
                setPriorities(defaultItems.map(item => item.id));
            }
        } catch (error) {
            console.error('Error loading priorities:', error);
            setPriorities(defaultItems.map(item => item.id));
        }
    }, []);

    // Move item up in the list
    const moveUp = (index) => {
        if (index === 0) return;
        const newPriorities = [...priorities];
        [newPriorities[index - 1], newPriorities[index]] = [newPriorities[index], newPriorities[index - 1]];
        setPriorities(newPriorities);
    };

    // Move item down in the list
    const moveDown = (index) => {
        if (index === priorities.length - 1) return;
        const newPriorities = [...priorities];
        [newPriorities[index], newPriorities[index + 1]] = [newPriorities[index + 1], newPriorities[index]];
        setPriorities(newPriorities);
    };

    // Handle drag start
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target);
    };

    // Handle drag over
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Handle drop
    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedIndex === null) return;

        const newPriorities = [...priorities];
        const draggedItem = newPriorities[draggedIndex];

        // Remove dragged item
        newPriorities.splice(draggedIndex, 1);
        // Insert at new position
        newPriorities.splice(dropIndex, 0, draggedItem);

        setPriorities(newPriorities);
        setDraggedIndex(null);
    };

    // Save priorities to the editor
    const savePriorities = async () => {
        try {
            setLoading(true);
            if (globalThis.EditorToolbar && globalThis.EditorToolbar.setPriorities) {
                globalThis.EditorToolbar.setPriorities(priorities);
            }
            setLoading(false);
            // Show success message or feedback here if needed
        } catch (error) {
            setLoading(false);
            console.error('Error saving priorities:', error);
        }
    };

    // Reset to default priorities
    const resetToDefault = () => {
        const defaultPriorities = defaultItems.map(item => item.id);
        setPriorities(defaultPriorities);
        if (globalThis.EditorToolbar && globalThis.EditorToolbar.resetPriorities) {
            globalThis.EditorToolbar.resetPriorities();
        }
    };

    // Get item details by ID
    const getItemDetails = (id) => {
        return defaultItems.find(item => item.id === id) || { id, label: id, description: 'Custom toolbar item' };
    };

    return (
        <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            maxWidth: '280px',
            margin: '0 auto',
            // padding: '20px',
            // backgroundColor: 't',
            height: '100%',
            maxHeight: '100%',
            overflow: 'scroll',
            padding: '10px'

        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#666'
            }}>
                <div
                    onClick={() => setSideBarMode('settings')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    <MenuIcon name="arrow_back" />
                </div>
                <div>Page settings</div>
                <div><MenuIcon name="chevron_right" /></div>
                <div>Toolbar</div>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
                fontSize: '24px',
                fontWeight: '600',
                color: '#333'
            }}>
                <ToolbarIcon />
                <div>Toolbar Settings</div>
            </div>

            <div style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '30px'
            }}>
                Customize the order of toolbar items. Drag and drop or use the arrow buttons to reorder.
            </div>

            <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px'
            }}>
                <button
                    onClick={savePriorities}
                    disabled={loading}
                    style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: loading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {loading && (
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>
                            sync
                        </span>
                    )}
                    Save Order
                </button>

                <button
                    onClick={resetToDefault}
                    style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    Reset to Default
                </button>
            </div>

            <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
            }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '15px',
                    color: '#333'
                }}>
                    Editor Toolbar Item Order (Priority)
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    {priorities.map((itemId, index) => {
                        const item = getItemDetails(itemId);
                        return (
                            <div
                                key={itemId}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '6px',
                                    padding: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'grab',
                                    transition: 'all 0.2s ease',
                                    boxShadow: draggedIndex === index ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-1px)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    if (draggedIndex !== index) {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    <div style={{
                                        backgroundColor: '#e9ecef',
                                        color: '#6c757d',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        minWidth: '30px',
                                        textAlign: 'center'
                                    }}>
                                        {index + 1}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: '#333',
                                            marginBottom: '2px'
                                        }}>
                                            {item.label}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#666'
                                        }}>
                                            {item.description}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveUp(index); }}
                                        disabled={index === 0}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid #dee2e6',
                                            borderRadius: '4px',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                                            opacity: index === 0 ? 0.4 : 1,
                                            color: '#6c757d'
                                        }}
                                        title="Move up"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                            keyboard_arrow_up
                                        </span>
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveDown(index); }}
                                        disabled={index === priorities.length - 1}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid #dee2e6',
                                            borderRadius: '4px',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: index === priorities.length - 1 ? 'not-allowed' : 'pointer',
                                            opacity: index === priorities.length - 1 ? 0.4 : 1,
                                            color: '#6c757d'
                                        }}
                                        title="Move down"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                            keyboard_arrow_down
                                        </span>
                                    </button>

                                    <div style={{
                                        width: '20px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'grab',
                                        color: '#6c757d'
                                    }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                            drag_indicator
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>


            <style>
                {`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }
                `}
            </style>
        </div>
    );
};

export { EditorToolbarSettings } 