import SurroundingDivs from 'app.components.surroundingDivs';
import { getStyleOf } from 'app.styles.styler';
const { render } = os.appHooks
await os.unregisterApp("main=toolbar")
await os.registerApp("main=toolbar")

const { useState, useEffect } = os.appHooks;

const Toolbar = () => {
    const [toolbarProps, setToolBarProps] = useState(that || null);
    const [toolbarBackground, setToolbarBackground] = useState('white');
    const [editMode, setEditMode] = useState(false);
    const [showEdit, setShowEdit] = useState()
    const [editableTools, setEditableTools] = useState([]);
    globalThis.ToolbarReSeedMode = setShowEdit
    useEffect(() => {
        globalThis.SetToolBarProps = setToolBarProps;
        globalThis.SetToolbarBackground = setToolbarBackground;

        // ✅ Only initialize if undefined
        if (globalThis.toolbarChanges === undefined) {
            globalThis.toolbarChanges = {};
        }

        return () => {
            globalThis.SetToolBarProps = null;
            globalThis.SetToolbarBackground = null;
        }
    }, []);


    // Load saved changes and initialize editable tools
    useEffect(() => {
        if (toolbarProps?.TabTools) {
            const toolsWithChanges = toolbarProps.TabTools.map((tool, index) => {
                const savedChanges = globalThis.toolbarChanges[index];
                return {
                    ...tool,
                    originalIndex: index,
                    visible: savedChanges?.visible !== undefined ? savedChanges.visible : (tool.active !== false),
                    icon: savedChanges?.icon || tool.icon,
                    label: savedChanges?.label || tool.label || `Tool ${index + 1}`,
                    isImg: savedChanges?.isImg !== undefined ? savedChanges.isImg : tool.isImg
                };
            });

            // Append any new tools saved globally
            const newTools = globalThis.newTool || [];
            setEditableTools([...toolsWithChanges, ...newTools]);
        }
    }, [toolbarProps]);


    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    const toggleToolVisibility = (index) => {
        setEditableTools(prev => prev.map((tool, i) =>
            i === index ? { ...tool, visible: !tool.visible } : tool
        ));
    };

    const updateToolIcon = (index, newIcon) => {
        setEditableTools(prev => prev.map((tool, i) =>
            i === index ? {
                ...tool,
                icon: newIcon,
                isImg: isValidUrl(newIcon) // Auto-detect if it's an image URL
            } : tool
        ));
    };

    const updateToolLabel = (index, newLabel) => {
        setEditableTools(prev => prev.map((tool, i) =>
            i === index ? { ...tool, label: newLabel } : tool
        ));
    };

    const toggleToolType = (index) => {
        setEditableTools(prev => prev.map((tool, i) =>
            i === index ? { ...tool, isImg: !tool.isImg } : tool
        ));
    };

    const isValidUrl = (string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    const applyChanges = () => {
        // Save changes globally
        editableTools.forEach((tool, index) => {
            globalThis.toolbarChanges[index] = {
                visible: tool.visible,
                icon: tool.icon,
                label: tool.label,
                isImg: tool.isImg,
                auxFile: tool.auxFile || null,
                extension: tool.extension || ''
            };
        });

        if (toolbarProps) {
            const updatedTabTools = editableTools.map(tool => ({
                ...tool,
                active: tool.visible,
                auxFile: tool.auxFile,
                extension: tool.extension
            }));

            const updatedProps = {
                ...toolbarProps,
                TabTools: updatedTabTools
            };

            setToolBarProps(updatedProps);
        }

        setEditMode(false);
    };

    const resetChanges = () => {
        if (toolbarProps?.TabTools) {
            setEditableTools(toolbarProps.TabTools.map((tool, index) => ({
                ...tool,
                originalIndex: index,
                visible: tool.active !== false,
                label: tool.label || `Tool ${index + 1}`
            })));
        }
    };

    const resetToDefaults = () => {
        // Clear all saved changes
        globalThis.toolbarChanges = {};

        if (toolbarProps?.TabTools) {
            setEditableTools(toolbarProps.TabTools.map((tool, index) => ({
                ...tool,
                originalIndex: index,
                visible: tool.active !== false,
                label: tool.label || `Tool ${index + 1}`
            })));
        }
    };

    if (!toolbarProps) {
        return <></>
    }

    useEffect(() => {
        const handleContextMenu = (e) => {
            e.preventDefault(); // Disable right-click
        };

        window.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);
    const addNewTool = () => {
        const newTool = {
            originalIndex: editableTools.length,
            icon: 'build',
            label: `New Tool ${editableTools.length + 1}`,
            visible: true,
            isImg: false,
            auxFile: null,
            extension: ''
        };

        // Save to globalThis.newTool
        if (!globalThis.newTool) {
            globalThis.newTool = [];
        }
        globalThis.newTool.push(newTool);

        setEditableTools(prev => [...prev, newTool]);
    };


    return (
        <>
            <div className="toolbar-container-1 boundElements">
                <SurroundingDivs action={toolbarProps.handleMouseLeaveContainer}>
                    <div
                        onMouseUp={toolbarProps.handleMouseUp}
                        className="toolbar-1 boundElements"
                        style={{
                            border: toolbarProps.sidebarMode.includes('toolbarSettings') ? '2px solid #4459F3' : null,
                            background: toolbarBackground,
                        }}
                    >
                        <div className="toolbar-item-wrapper">
                            <button
                                onClick={() => toolbarProps.navFunctions?.openPrevChapter()}
                                className="toolbar-button"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                        </div>

                        {editableTools.map((tool, index) => tool?.visible && (
                            <div
                                key={`${tool.icon}-${index}`}
                                className="toolbar-item-wrapper"
                                onMouseEnter={() => toolbarProps.handleMouseEnter(index)}
                                title={tool.label}
                            >
                                {index === toolbarProps.draggedIndex ? (
                                    <div className="toolbar-button placeholder"></div>
                                ) : (
                                    <button
                                        className="toolbar-button"
                                        onMouseDown={() => {
                                            toolbarProps.hasHeldRef.current = false;

                                            toolbarProps.holdTimeoutRef.current = setTimeout(() => {
                                                os.log('the other', tool?.onRightClick || tool?.onHold)
                                                if (tool?.onRightClick) tool.onRightClick();
                                                else if (tool?.onHold) tool.onHold();
                                                toolbarProps.hasHeldRef.current = true;
                                            }, 600);
                                        }}
                                        onMouseUp={(e) => {
                                            os.log(e, 'elements')
                                            clearTimeout(toolbarProps.holdTimeoutRef.current);

                                            if (!toolbarProps.hasHeldRef.current && tool.onClick) {
                                                tool.onClick();
                                            }

                                            if (toolbarProps.isDragging) {
                                                toolbarProps.setIsDragging(false);
                                                toolbarProps.setElement(null);
                                                toolbarProps.setDraggedIndex(null);
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            clearTimeout(toolbarProps.holdTimeoutRef.current);
                                        }}

                                    >
                                        {tool.isImg
                                            ? <ImageWrapper>
                                                <img src={tool.icon} style={{ width: '20px' }} alt={tool.label} />
                                            </ImageWrapper>
                                            : <span className="material-symbols-outlined">{tool.icon}</span>}
                                    </button>
                                )}
                            </div>
                        ))}

                        <div className="toolbar-item-wrapper">
                            <button
                                onClick={() => toolbarProps.navFunctions?.openNextChapter()}
                                className="toolbar-button"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>

                        {showEdit && <div className="toolbar-item-wrapper toolbar-edit-toggle">
                            <button
                                style={{ position: 'absolute', 'bottom': '6px', background: 'white', color: 'blue' }}
                                onClick={toggleEditMode}
                                className={`toolbar-button ${editMode ? 'edit-active' : ''}`}
                                title="Edit Toolbar"
                            >
                                <span className="material-symbols-outlined">
                                    {editMode ? 'close' : 'tune'}
                                </span>
                            </button>
                        </div>}
                    </div>
                </SurroundingDivs>
                <style>{getStyleOf('toolbar.css')}</style>
            </div>

            {editMode && (
                <div className="edit-mode-overlay">
                    <div className="edit-mode-panel">
                        <div className="edit-panel-header">
                            <h3>Edit Toolbar</h3>
                            <div className="header-actions">
                                <button onClick={resetToDefaults} className="reset-defaults-btn" title="Reset to original defaults">
                                    <span className="material-symbols-outlined">restore</span>
                                </button>
                                <button onClick={toggleEditMode} className="close-panel-btn">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="edit-panel-content">
                            <div className="tools-grid">
                                {editableTools.map((tool, index) => (
                                    <div key={index} className={`tool-edit-item ${!tool.visible ? 'tool-hidden' : ''}`}>
                                        <div className="tool-preview">
                                            {tool.isImg ? (
                                                <img src={tool.icon} style={{ width: '24px', height: '24px', objectFit: 'contain' }} alt={tool.label} />
                                            ) : (
                                                <span className="material-symbols-outlined">{tool.icon}</span>
                                            )}
                                        </div>

                                        <div className="tool-controls">
                                            <div className="control-group">
                                                <label className="control-label">Name:</label>
                                                <input
                                                    type="text"
                                                    value={tool.label}
                                                    onChange={(e) => updateToolLabel(index, e.target.value)}
                                                    className="text-input"
                                                    placeholder="Tool name"
                                                />
                                            </div>

                                            <div className="control-group">
                                                <label className="control-label">Icon:</label>
                                                <input
                                                    type="text"
                                                    value={tool.icon}
                                                    onChange={(e) => updateToolIcon(index, e.target.value)}
                                                    className="text-input"
                                                    placeholder="Icon name or URL"
                                                />
                                            </div>


                                            <div className="control-row">
                                                <label className="toggle-control">
                                                    <input
                                                        type="checkbox"
                                                        checked={tool.visible}
                                                        onChange={() => toggleToolVisibility(index)}
                                                    />
                                                    <span className="toggle-label">
                                                        <span className="material-symbols-outlined">
                                                            {tool.visible ? 'visibility' : 'visibility_off'}
                                                        </span>
                                                        Show
                                                    </span>
                                                </label>

                                                <label className="toggle-control">
                                                    <input
                                                        type="checkbox"
                                                        checked={tool.isImg}
                                                        onChange={() => toggleToolType(index)}
                                                    />
                                                    <span className="toggle-label">
                                                        <span className="material-symbols-outlined">image</span>
                                                        Image
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="control-group">
                                            <label className="control-label">Upload Aux File:</label>
                                            <input
                                                type="file"
                                                accept="*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            const fileContent = reader.result;
                                                            setEditableTools(prev => prev.map((tool, i) =>
                                                                i === index ? { ...tool, auxFile: fileContent } : tool
                                                            ));
                                                        };
                                                        reader.readAsText(file);
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div className="control-group">
                                            <label className="control-label">Extension:</label>
                                            <input
                                                type="text"
                                                value={tool.extension || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setEditableTools(prev => prev.map((tool, i) =>
                                                        i === index ? { ...tool, extension: value } : tool
                                                    ));
                                                }}
                                                className="text-input"
                                                placeholder=".json, .js, etc"
                                            />
                                        </div>

                                        <div className="tool-info">
                                            <small>Position: #{index + 1}</small>
                                            {globalThis.toolbarChanges[index] && (
                                                <small className="modified-indicator">• Modified</small>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="edit-panel-actions">
                            <button onClick={resetChanges} className="reset-btn">
                                <span className="material-symbols-outlined">undo</span>
                                Reset
                            </button>
                            <button onClick={applyChanges} className="apply-btn">
                                <span className="material-symbols-outlined">check</span>
                                Apply Changes
                            </button>
                            <button onClick={addNewTool} className="new-tool-btn">
                                <span className="material-symbols-outlined">add</span>
                                New Tool
                            </button>

                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .toolbar-edit-toggle {
                    margin-left: auto;
                }
                
                .toolbar-button.edit-active {
                    background-color: #4459F3;
                    color: white;
                }
                
                .edit-mode-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    backdrop-filter: blur(4px);
                }
                
                .edit-mode-panel {
                    background: white;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 900px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                }
                
                .edit-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e5e5;
                    background: #fafafa;
                }
                
                .edit-panel-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1a1a1a;
                }
                
                .header-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                .reset-defaults-btn, .close-panel-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #666;
                    transition: all 0.2s;
                }
                
                .reset-defaults-btn:hover {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                
                .close-panel-btn:hover {
                    background: #ffebee;
                    color: #d32f2f;
                }
                
                .edit-panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                }
                
                .tools-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                }
                
                .tool-edit-item {
                    border: 2px solid #e5e5e5;
                    border-radius: 12px;
                    padding: 20px;
                    background: white;
                    transition: all 0.2s;
                    position: relative;
                }
                    .new-tool-btn {
                        background: #4caf50;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 14px;
                    }
                    .new-tool-btn:hover {
                        background: #388e3c;
                    }

                .tool-edit-item:hover {
                    border-color: #4459F3;
                    box-shadow: 0 4px 12px rgba(68, 89, 243, 0.1);
                }
                
                .tool-edit-item.tool-hidden {
                    opacity: 0.6;
                    border-color: #ccc;
                    background: #f8f8f8;
                }
                
                .tool-preview {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    background: #f5f5f5;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    font-size: 24px;
                }
                
                .tool-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 12px;
                }
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                
                .control-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #555;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .text-input {
                    padding: 10px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }
                
                .text-input:focus {
                    outline: none;
                    border-color: #4459F3;
                    box-shadow: 0 0 0 3px rgba(68, 89, 243, 0.1);
                }
                
                .control-row {
                    display: flex;
                    gap: 16px;
                }
                
                .toggle-control {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    transition: background-color 0.2s;
                    flex: 1;
                }
                
                .toggle-control:hover {
                    background: #f5f5f5;
                }
                
                .toggle-control input[type="checkbox"] {
                    margin: 0;
                    width: 16px;
                    height: 16px;
                }
                
                .toggle-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                }
                
                .toggle-label .material-symbols-outlined {
                    font-size: 16px;
                    color: #666;
                }
                
                .tool-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #666;
                    font-size: 12px;
                    padding-top: 12px;
                    border-top: 1px solid #f0f0f0;
                }
                
                .modified-indicator {
                    color: #4459F3;
                    font-weight: 600;
                }
                
                .edit-panel-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    padding: 20px 24px;
                    border-top: 1px solid #e5e5e5;
                    background: #fafafa;
                }
                
                .reset-btn, .apply-btn {
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }
                
                .reset-btn {
                    background: #f5f5f5;
                    color: #333;
                    border: 1px solid #ddd;
                }
                
                .reset-btn:hover {
                    background: #e5e5e5;
                    border-color: #ccc;
                }
                
                .apply-btn {
                    background: #4459F3;
                    color: white;
                }
                
                .apply-btn:hover {
                    background: #3a4de8;
                    box-shadow: 0 4px 12px rgba(68, 89, 243, 0.3);
                }
            `}</style>
        </>
    );
}

os.compileApp('main=toolbar', <Toolbar />);