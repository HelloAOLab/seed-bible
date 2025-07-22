const { useState, useRef } = os.appHooks;
import { Space, LoadSpace, ToolbarIcon, UserAvatar } from 'app.components.icons'
import { useTabsContext } from 'app.hooks.tabs';
const { useEffect } = os.appHooks;
export function ImportSpaceModal() {
    const [spaceId, setSpaceId] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        // Handle file drop logic here
    };

    const handleBrowseClick = () => {
        fileInputRef.current.click();
    };

    // Styles
    const styles = {
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
        },
        modalContainer: {
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            width: '320px',
            padding: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        },
        headerText: {
            fontSize: '14px',
            color: '#4b5563',
            marginBottom: '16px'
        },
        inputContainer: {
            marginBottom: '16px'
        },
        input: {
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb'
        },
        orDivider: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
        },
        orText: {
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '500'
        },
        dropArea: {
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: '16px',
            border: isDragging ? '2px solid #3b82f6' : '1px solid #e5e7eb'
        },
        iconContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px',
            position: 'relative'
        },
        folderIcon: {
            backgroundColor: '#3b82f6',
            borderRadius: '4px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
        },
        plusBadge: {
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            backgroundColor: '#eab308',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        browseText: {
            color: '#3b82f6',
            fontSize: '14px',
            fontWeight: '500'
        },
        limitText: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px'
        },
        hiddenInput: {
            display: 'none'
        },
        importButton: {
            width: '100%',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            padding: '8px',
            borderRadius: '8px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '8px'
        },
        cancelButton: {
            width: '100%',
            backgroundColor: 'transparent',
            color: '#4b5563',
            padding: '8px',
            borderRadius: '8px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer'
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContainer}>
                <div style={styles.headerText}>
                    To import space please enter "space ID" or through "aux file"
                </div>

                <div style={styles.inputContainer}>
                    <input
                        type="text"
                        placeholder="Space ID"
                        style={styles.input}
                        value={spaceId}
                        onChange={(e) => setSpaceId(e.target.value)}
                    />
                </div>

                <div style={styles.orDivider}>
                    <div style={styles.orText}>OR</div>
                </div>

                <div
                    style={styles.dropArea}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleBrowseClick}
                >
                    <div style={styles.iconContainer}>
                        <div style={styles.folderIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            <div style={styles.plusBadge}>
                                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '12px', height: '12px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div style={styles.browseText}>Click to Browse, or drag and drop</div>
                    <div style={styles.limitText}>Maximum 200 MB, aux only</div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={styles.hiddenInput}
                        accept=".aux"
                    />
                </div>

                <button style={styles.importButton} onMouseOver={(e) => e.target.style.backgroundColor = '#4338ca'} onMouseOut={(e) => e.target.style.backgroundColor = '#4f46e5'}>
                    Import space
                </button>

                <button onClick={closePopupSettings} style={styles.cancelButton} onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'} onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

export function RenameSpaceModal({ updateSpace, activeSpace }) {
    const [spaceName, setSpaceName] = useState('My Space');
    const [selectedIcon, setSelectedIcon] = useState({ id: 'star', emoji: '⭐', label: 'Star' },);
    const [showIconPicker, setShowIconPicker] = useState(false);

    // Sample icon options
    const iconOptions = [
        { id: 'folder', emoji: '📁', label: 'Folder' },
        { id: 'document', emoji: '📄', label: 'Document' },
        { id: 'book', emoji: '📚', label: 'Book' },
        { id: 'rocket', emoji: '🚀', label: 'Rocket' },
        { id: 'star', emoji: '⭐', label: 'Star' },
        { id: 'heart', emoji: '❤️', label: 'Heart' },
        { id: 'bulb', emoji: '💡', label: 'Idea' },
        { id: 'target', emoji: '🎯', label: 'Target' },
        { id: 'chart', emoji: '📊', label: 'Chart' },
        { id: 'globe', emoji: '🌎', label: 'Globe' },
        { id: 'calendar', emoji: '📅', label: 'Calendar' },
        { id: 'bell', emoji: '🔔', label: 'Notification' }
    ];

    const styles = {
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
        },
        modalContainer: {
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            width: '340px',
            padding: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        },
        headerText: {
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            textAlign: 'center'
        },
        formGroup: {
            marginBottom: '16px'
        },
        label: {
            display: 'block',
            fontSize: '14px',
            color: '#4b5563',
            marginBottom: '6px',
            fontWeight: '500'
        },
        input: {
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            fontSize: '14px'
        },
        iconSelectContainer: {
            marginBottom: '20px'
        },
        iconButton: {
            display: 'flex',
            alignItems: 'center',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            cursor: 'pointer',
            width: '100%',
            justifyContent: 'space-between'
        },
        iconPreview: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        iconEmoji: {
            fontSize: '20px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px'
        },
        iconText: {
            fontSize: '14px',
            color: '#4b5563'
        },
        chevronIcon: {
            color: '#9ca3af'
        },
        iconPickerContainer: {
            marginTop: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: '#ffffff',
            display: showIconPicker ? 'block' : 'none'
        },
        iconGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px'
        },
        iconOption: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '20px',
            backgroundColor: '#f3f4f6'
        },
        selectedIconOption: {
            backgroundColor: '#dbeafe',
            border: '2px solid #3b82f6'
        },
        buttonContainer: {
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px'
        },
        cancelButton: {
            flex: '1',
            backgroundColor: '#f3f4f6',
            color: '#4b5563',
            padding: '10px',
            borderRadius: '8px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
        },
        saveButton: {
            flex: '1',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            padding: '10px',
            borderRadius: '8px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
        }
    };

    const handleIconSelect = (icon) => {
        setSelectedIcon(icon);
        setShowIconPicker(false);
    };

    const handleSave = () => {
        // Handle save logic here
        // closePopupSettings()
        // console.log('Space renamed to:', spaceName, 'with icon:', selectedIcon);
        // updateSpace(activeSpace, { name: spaceName, icon: selectedIcon.emoji })
    };

    const handleCancel = () => {
        // Handle cancel logic here
        closePopupSettings()
        console.log('Rename canceled');
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContainer}>
                <div style={styles.headerText}>
                    Rename Space
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>
                        Space name
                    </label>
                    <input
                        type="text"
                        style={styles.input}
                        value={spaceName}
                        onChange={(e) => setSpaceName(e.target.value)}
                    />
                </div>

                <div style={styles.iconSelectContainer}>
                    <label style={styles.label}>
                        Icon
                    </label>
                    <div
                        style={styles.iconButton}
                        onClick={() => setShowIconPicker(!showIconPicker)}
                    >
                        <div style={styles.iconPreview}>
                            <div style={styles.iconEmoji}>
                                {selectedIcon.emoji}
                            </div>
                            <div style={styles.iconText}>
                                {selectedIcon.label}
                            </div>
                        </div>
                        <div style={styles.chevronIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                            </svg>
                        </div>
                    </div>

                    <div style={styles.iconPickerContainer}>
                        <div style={styles.iconGrid}>
                            {iconOptions.map((icon) => (
                                <div
                                    key={icon.id}
                                    style={{
                                        ...styles.iconOption,
                                        ...(selectedIcon && selectedIcon.id === icon.id ? styles.selectedIconOption : {})
                                    }}
                                    onClick={() => handleIconSelect(icon)}
                                >
                                    {icon.emoji}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={styles.buttonContainer}>
                    <button
                        style={styles.cancelButton}
                        onClick={closePopupSettings}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    >
                        Cancel
                    </button>

                    <button
                        style={styles.saveButton}
                        onClick={handleSave}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#4338ca'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#4f46e5'}
                        disabled={!spaceName.trim()}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CreateNewSpaceModal({ addSpace }) {
    const [spaceName, setSpaceName] = useState('');
    const [spaceDescription, setSpaceDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [enableComments, setEnableComments] = useState(true);
    const [selectedIcon, setSelectedIcon] = useState({ id: 'star', emoji: '⭐', label: 'Star' },);
    const [showIconPicker, setShowIconPicker] = useState(false);

    // Sample icon options
    const iconOptions = [
        { id: 'folder', emoji: '📁', label: 'Folder' },
        { id: 'document', emoji: '📄', label: 'Document' },
        { id: 'book', emoji: '📚', label: 'Book' },
        { id: 'rocket', emoji: '🚀', label: 'Rocket' },
        { id: 'star', emoji: '⭐', label: 'Star' },
        { id: 'heart', emoji: '❤️', label: 'Heart' },
        { id: 'bulb', emoji: '💡', label: 'Idea' },
        { id: 'target', emoji: '🎯', label: 'Target' },
        { id: 'chart', emoji: '📊', label: 'Chart' },
        { id: 'globe', emoji: '🌎', label: 'Globe' },
        { id: 'calendar', emoji: '📅', label: 'Calendar' },
        { id: 'bell', emoji: '🔔', label: 'Notification' }
    ];

    const styles = {
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
        },
        modalContainer: {
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            width: '380px',
            padding: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            padding: " 30px !important",
        },
        headerText: {
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            textAlign: 'center'
        },
        formGroup: {
            marginBottom: '16px'
        },
        label: {
            display: 'block',
            fontSize: '14px',
            color: '#4b5563',
            marginBottom: '6px',
            fontWeight: '500'
        },
        input: {
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            fontSize: '14px'
        },
        textarea: {
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            fontSize: '14px',
            minHeight: '80px',
            resize: 'vertical'
        },
        iconSelectContainer: {
            marginBottom: '16px'
        },
        iconButton: {
            display: 'flex',
            alignItems: 'center',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            cursor: 'pointer',
            width: '100%',
            justifyContent: 'space-between'
        },
        iconPreview: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        iconEmoji: {
            fontSize: '20px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px'
        },
        iconText: {
            fontSize: '14px',
            color: '#4b5563'
        },
        chevronIcon: {
            color: '#9ca3af'
        },
        iconPickerContainer: {
            marginTop: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: '#ffffff',
            display: showIconPicker ? 'block' : 'none'
        },
        iconGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px'
        },
        iconOption: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '20px',
            backgroundColor: '#f3f4f6'
        },
        selectedIconOption: {
            backgroundColor: '#dbeafe',
            border: '2px solid #3b82f6'
        },
        optionsContainer: {
            marginBottom: '20px'
        },
        optionRow: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px'
        },
        checkbox: {
            marginRight: '8px',
            width: '16px',
            height: '16px',
            accentColor: '#4f46e5'
        },
        optionLabel: {
            fontSize: '14px',
            color: '#4b5563'
        },
        buttonContainer: {
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '8px'
        },
        cancelButton: {
            flex: '1',
            backgroundColor: '#f3f4f6',
            color: '#4b5563',
            padding: '10px',
            borderRadius: '8px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
        },
        createButton: {
            flex: '1',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            padding: '10px',
            borderRadius: '8px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
        },
        helperText: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px'
        }
    };

    const handleIconSelect = (icon) => {
        setSelectedIcon(icon);
        setShowIconPicker(false);
    };

    const handleCreate = () => {
        // Handle create logic here
        console.log('Creating new space:', {
            name: spaceName,
            description: spaceDescription,
            isPrivate,
            enableComments,
            icon: selectedIcon
        });
        addSpace(spaceName, selectedIcon.emoji)
        closePopupSettings()
    };

    const handleCancel = () => {
        // Handle cancel logic here
        console.log('Create canceled');
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContainer}>
                <div style={styles.headerText}>
                    Create New Space
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>
                        Space name *
                    </label>
                    <input
                        type="text"
                        style={styles.input}
                        value={spaceName}
                        onChange={(e) => setSpaceName(e.target.value)}
                        placeholder="Enter space name"
                        required
                    />
                </div>

                <div style={styles.iconSelectContainer}>
                    <label style={styles.label}>
                        Icon
                    </label>
                    <div
                        style={styles.iconButton}
                        onClick={() => setShowIconPicker(!showIconPicker)}
                    >
                        <div style={styles.iconPreview}>
                            <div style={styles.iconEmoji}>
                                {selectedIcon ? selectedIcon.emoji : '📁'}
                            </div>
                            <div style={styles.iconText}>
                                {selectedIcon ? selectedIcon.label : 'Select an icon'}
                            </div>
                        </div>
                        <div style={styles.chevronIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                            </svg>
                        </div>
                    </div>

                    <div style={styles.iconPickerContainer}>
                        <div style={styles.iconGrid}>
                            {iconOptions.map((icon) => (
                                <div
                                    key={icon.id}
                                    style={{
                                        ...styles.iconOption,
                                        ...(selectedIcon && selectedIcon.id === icon.id ? styles.selectedIconOption : {})
                                    }}
                                    onClick={() => handleIconSelect(icon)}
                                >
                                    {icon.emoji}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>
                        Description (optional)
                    </label>
                    <textarea
                        style={styles.textarea}
                        value={spaceDescription}
                        onChange={(e) => setSpaceDescription(e.target.value)}
                        placeholder="Add a brief description of your space"
                    />
                    <div style={styles.helperText}>
                        A good description helps others understand the purpose of this space
                    </div>
                </div>



                <div style={styles.buttonContainer}>
                    <button
                        style={styles.cancelButton}
                        onClick={closePopupSettings}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    >
                        Cancel
                    </button>

                    <button
                        style={styles.createButton}
                        onClick={handleCreate}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#4338ca'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#4f46e5'}
                        disabled={!spaceName.trim()}
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}

export function SpaceSettingsForm() {


    const { updateSpace, activeSpace, spaces } = useTabsContext();
    const CurrentSpace = spaces.find(e => e.id === activeSpace)
    const [spaceName, setSpaceName] = useState(CurrentSpace.name);
    const [selectedIcon, setSelectedIcon] = useState(CurrentSpace?.iconIndex || 0);

    const icons = [
        <Space />,
        'dashboard',
        'auto_stories',
        'menu_book',
        'bookmarks',
        'library_books',
        'history',
        'event_note',
        'schedule',
        'insights',
        'favorite',
        'lightbulb',
        'check_circle',
        'track_changes',
        'timeline',
        'person_pin',
        'note_alt',
        'chat_bubble',
        'explore'
    ];

    const handleSave = () => {
        // updateSpace(activeSpace, { name: spaceName, icon: icons[selectedIcon],iconIndex:selectedIcon })
        // alert(`Settings saved!\nSpace Name: ${spaceName}\nSelected Icon: ${selectedIcon}`);
    };

    useEffect(() => {
        updateSpace(activeSpace, { name: spaceName })
    }, [spaceName])
    useEffect(() => {
        updateSpace(activeSpace, { icon: icons[selectedIcon], iconIndex: selectedIcon })
    }, [selectedIcon])



    return (
        <>
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
            <div style={styles.container}>
                <div style={styles.settingsBox}>


                    <div style={styles.content}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <span className="material-icons" style={styles.labelIcon}>edit</span>
                                Space Name
                            </label>
                            <input
                                type="text"
                                value={spaceName}
                                onChange={(e) => setSpaceName(e.target.value)}
                                placeholder="Enter space name"
                                style={styles.input}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#4285f4';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(66, 133, 244, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#ddd';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <span className="material-icons" style={styles.labelIcon}>palette</span>
                                Space Icon
                            </label>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export const SpaceSelector = () => {
    const { updateSpace, activeSpace, spaces } = useTabsContext();
    const CurrentSpace = spaces.find(e => e.id === activeSpace)
    const [selectedIcon, setSelectedIcon] = useState(CurrentSpace?.iconIndex || 0);
    const icons = [
        <Space />,
       'dashboard',
        'auto_stories',
        'menu_book',
        'bookmarks',
        'library_books',
        'history',
        'event_note',
        'schedule',
        'insights',
        'favorite',
        'lightbulb',
        'check_circle',
        'track_changes',
        'timeline',
        'person_pin',
        'note_alt',
        'chat_bubble',
        'explore'
    ];
    // useEffect(() => {
    //     updateSpace(activeSpace, { icon: icons[selectedIcon], iconIndex: selectedIcon })
    //     console.log(activeSpace, { icon: icons[selectedIcon], iconIndex: selectedIcon })
    // }, [selectedIcon])
    return <div style={styles.inputGroup}>
        <div style={styles.iconGrid}>
            {icons.map((icon, index) => (
                <div
                    key={icon}
                    onClick={() => {
                        // setSelectedIcon(index);
                        updateSpace(activeSpace, { icon: icons[index], iconIndex: index })
                    }}
                    style={{
                        ...styles.iconOption,
                        ...(selectedIcon === index ? styles.iconOptionSelected : {})
                    }}
                    onMouseOver={(e) => {
                        if (selectedIcon !== index) {
                            e.target.style.borderColor = '#4285f4';
                        }
                    }}
                    onMouseOut={(e) => {
                        if (selectedIcon !== index) {
                            e.target.style.borderColor = '#ddd';
                        }
                    }}
                >
                    <span
                        className="material-symbols-outlined"
                        style={selectedIcon === icon ? styles.iconSelected : styles.icon}
                    >
                        {icon}
                    </span>
                </div>
            ))}
        </div>
    </div>
}
const styles = {
    container: {
        //   minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        //   padding: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    settingsBox: {
        //   background: 'white',
        borderRadius: '8px',
        //   boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '100%'
    },
    header: {
        padding: '16px 20px',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    title: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        margin: 0
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#666',
        fontSize: '18px'
    },
    content: {
        padding: '20px'
    },
    inputGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        color: '#555',
        fontSize: '14px',
        fontWeight: '500'
    },
    labelIcon: {
        marginRight: '8px',
        fontSize: '18px',
        color: '#666'
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        background: 'white',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxSizing: 'border-box'
    },
    inputFocus: {
        borderColor: '#4285f4',
        boxShadow: '0 0 0 2px rgba(66, 133, 244, 0.1)'
    },
    iconGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginTop: '8px',
        padding: '12px',
        background: 'white'
    },
    iconOption: {
        width: '36px',
        height: '36px',
        border: '2px solid #ddd',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: 'white'
    },
    iconOptionSelected: {
        borderColor: '#4285f4',
        background: '#e8f0fe'
    },
    iconOptionHover: {
        borderColor: '#4285f4'
    },
    icon: {
        fontSize: '18px',
        color: '#666'
    },
    iconSelected: {
        fontSize: '18px',
        color: '#4285f4'
    },
    saveBtn: {
        width: '100%',
        padding: '12px',
        background: '#ff9800',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '20px',
        transition: 'background-color 0.2s'
    }
};