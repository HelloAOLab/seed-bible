const { useState, useEffect } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { SpaceIcon } from 'app.components.images';
import { ProfileCard } from 'app.components.profileCard';
import { useSideBarContext } from 'app.hooks.sideBar';
import { Space, LoadSpace, ToolbarIcon, UserAvatar } from 'app.components.icons'
import { useTabsContext } from 'app.hooks.tabs';
import { useBibleContext } from 'app.hooks.bibleVariables';
import {
    SpaceSettingsForm,
    SpaceSelector
} from 'app.components.spaceSettings'


const SettingsSidebar = () => {
    const [activeTab, setActiveTab] = useState('space');
    globalThis.SetActiveSettingsTab = setActiveTab
    const { sidebarMode, setSideBarMode } = useSideBarContext();
    const { openPopupSettings, closePopupSettings } = useSideBarContext();
    const { updateSpace, activeSpace, spaces, downloadSpaceAsJSON, replaceActiveSpaceWithJSON } = useTabsContext()
    const CurrentSpace = spaces.find(e => e.id === activeSpace)
    const [expandedSections, setExpandedSections] = useState({
        layers: false,
        bibleDefaults: false,
        pageSettings: true,
        canvasSettings: false,
        mapSettings: true
    });

    // New state for edit mode and settings customization
    const [editMode, setEditMode] = useState(false);
    const { ReSeed, setReSeed } = useBibleContext()
    useEffect(() => {
        setEditMode(ReSeed)
    }, [ReSeed])
    const [settingsVisibility, setSettingsVisibility] = useState({});
    const [settingsLabels, setSettingsLabels] = useState({});
    const [editingLabel, setEditingLabel] = useState(null);

    // Space content state
    const [spaceContentVisibility, setSpaceContentVisibility] = useState({});
    const [spaceContentLabels, setSpaceContentLabels] = useState({});
    const [spaceDescription, setSpaceDescription] = useState('Settings for your space. Customize the toolbar, theme, text, and more. An extension store with more capability will be available at a later date.');

    // Initialize globalThis.changes if it doesn't exist
    if (!globalThis.changes) {
        globalThis.changes = {
            settingsVisibility: {},
            settingsLabels: {},
            spaceContentVisibility: {},
            spaceContentLabels: {}
        };
    }

    // Space content configuration
    const spaceContentConfig = [
        { key: 'spaceIcon', label: 'Space Icon', type: 'component' },
        { key: 'spaceName', label: 'Space Name', type: 'component' },
        { key: 'spaceDescription', label: 'Space Description', type: 'text', content: 'Settings for your space. Customize the toolbar, theme, text, and more. An extension store with more capability will be available at a later date.' }
    ];

    const baseSettingsConfig = [
        { key: 'theme', label: 'Theme', icon: 'palette', expandable: false, onClick: () => setSideBarMode('themeSettings') },
        { key: 'layers', label: 'Layers', icon: 'layers', style: 'disabled', expandable: true },
        { key: 'bibleDefaults', label: 'Bible Defaults', style: 'disabled', icon: 'book', expandable: true },
        { key: 'divider1', type: 'divider' },
        {
            key: 'pageSettings', label: 'Page Settings', icon: 'article', expandable: true, subItems: [
                { key: 'toolbar', label: 'Toolbar', icon: `construction`, onClick: () => setSideBarMode('toolbarSettings-Page') },
                // { key: 'panel', label: 'Panel', icon: 'view_sidebar' },
                { key: 'text', label: 'Text', icon: 'text_fields', onClick: () => setSideBarMode('textSettings') },
                { key: 'extensions', label: 'Extensions', icon: 'extension' },
                { key: 'ai', label: 'AI', icon: 'smart_toy', onClick: () => setSideBarMode('aiSettings') },
                { key: 'tab', label: 'Tab', icon: 'description', onClick: () => setSideBarMode('tabSettings') },
                { key: 'mentuText', label: 'Menu text', icon: 'text_fields', onClick: () => setSideBarMode('menuTextSettings') },
            ]
        },
        { key: 'divider2', type: 'divider' },
        {
            key: 'canvasSettings', label: 'Canvas Settings', icon: 'dashboard_customize', expandable: true, subItems: [
                { key: 'toolbar', label: 'Toolbar', icon: `construction`, onClick: () => setSideBarMode('toolbarSettings-Canvas') },
                // { key: 'panel', label: 'Panel', icon: 'view_sidebar' },
                { key: 'text', label: 'Promt Bar', icon: 'text_fields', onClick: () => setSideBarMode('promtSettings') },
                { key: 'extensions', label: 'Extensions', icon: 'extension' },
                { key: 'ai', label: 'AI', icon: 'smart_toy', onClick: () => setSideBarMode('canvasAiSettings') },
            ]
        },
        { key: 'divider3', type: 'divider' },
        {
            key: 'LoadSpace', label: 'Load new space', icon: <LoadSpace />, expandable: false, onClick: async () => {
                const files = await os.showUploadFiles()
                if (files.length !== 0) {
                    const file = files[0]
                    replaceActiveSpaceWithJSON(file, CurrentSpace.id)
                }
            }
        },
        {
            key: 'DownloadSpace', label: 'Download space', icon: 'download', expandable: false, onClick: () => {
                downloadSpaceAsJSON(CurrentSpace.id)
            }
        },
        { key: 'Share', label: 'Share', icon: 'share', expandable: false },
    ];

    // Load saved changes from globalThis and initialize visibility and labels
    useEffect(() => {
        const savedVisibility = globalThis.changes.settingsVisibility || {};
        const savedLabels = globalThis.changes.settingsLabels || {};
        const savedSpaceVisibility = globalThis.changes.spaceContentVisibility || {};
        const savedSpaceLabels = globalThis.changes.spaceContentLabels || {};

        const initialVisibility = {};
        const initialLabels = {};

        const initializeSettings = (items, parentKey = '') => {
            items.forEach(item => {
                if (item.type !== 'divider') {
                    const fullKey = parentKey ? `${parentKey}.${item.key}` : item.key;
                    // Use saved visibility or default to true
                    initialVisibility[fullKey] = savedVisibility[fullKey] !== undefined ? savedVisibility[fullKey] : true;
                    // Use saved label or default label
                    initialLabels[fullKey] = savedLabels[fullKey] || item.label;

                    if (item.subItems) {
                        initializeSettings(item.subItems, item.key);
                    }
                }
            });
        };

        // Initialize space content visibility and labels
        const initializeSpaceContent = () => {
            const spaceVisibility = {};
            const spaceLabels = {};

            spaceContentConfig.forEach(item => {
                spaceVisibility[item.key] = savedSpaceVisibility[item.key] !== undefined ? savedSpaceVisibility[item.key] : true;
                spaceLabels[item.key] = savedSpaceLabels[item.key] || item.label;
            });

            setSpaceContentVisibility(spaceVisibility);
            setSpaceContentLabels(spaceLabels);
        };

        initializeSettings(baseSettingsConfig);
        initializeSpaceContent();

        setSettingsVisibility(initialVisibility);
        setSettingsLabels(initialLabels);
    }, []);

    // Generate settings config with custom labels and visibility
    const settingsConfig = baseSettingsConfig.map(item => {
        if (item.type === 'divider') return item;

        const isVisible = settingsVisibility[item.key] !== false;
        if (!isVisible && !editMode) return null;

        const customLabel = settingsLabels[item.key] || item.label;

        return {
            ...item,
            label: customLabel,
            hidden: !isVisible,
            subItems: item.subItems?.map(subItem => {
                const subKey = `${item.key}.${subItem.key}`;
                const subVisible = settingsVisibility[subKey] !== false;
                if (!subVisible && !editMode) return null;

                return {
                    ...subItem,
                    label: settingsLabels[subKey] || subItem.label,
                    hidden: !subVisible
                };
            }).filter(Boolean)
        };
    }).filter(Boolean);

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const toggleVisibility = (key, parentKey = '') => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        const newVisibility = {
            ...settingsVisibility,
            [fullKey]: !settingsVisibility[fullKey]
        };

        setSettingsVisibility(newVisibility);

        // Save to globalThis.changes
        globalThis.changes.settingsVisibility = newVisibility;
    };

    const handleLabelEdit = (key, parentKey = '', newLabel) => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        const newLabels = {
            ...settingsLabels,
            [fullKey]: newLabel
        };

        setSettingsLabels(newLabels);

        // Save to globalThis.changes
        globalThis.changes.settingsLabels = newLabels;
    };

    const startEditingLabel = (key, parentKey = '') => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        setEditingLabel(fullKey);
    };

    const finishEditingLabel = () => {
        setEditingLabel(null);
    };

    const toggleSpaceContentVisibility = (key) => {
        const newVisibility = {
            ...spaceContentVisibility,
            [key]: !spaceContentVisibility[key]
        };

        setSpaceContentVisibility(newVisibility);
        globalThis.changes.spaceContentVisibility = newVisibility;
    };

    const handleSpaceContentLabelEdit = (key, newLabel) => {
        const newLabels = {
            ...spaceContentLabels,
            [key]: newLabel
        };

        setSpaceContentLabels(newLabels);
        globalThis.changes.spaceContentLabels = newLabels;
    };

    const handleSpaceDescriptionEdit = (newDescription) => {
        setSpaceDescription(newDescription);
        if (!globalThis.changes.spaceContentData) {
            globalThis.changes.spaceContentData = {};
        }
        globalThis.changes.spaceContentData.spaceDescription = newDescription;
    };

    // Load space description from saved data
    useEffect(() => {
        const savedDescription = globalThis.changes.spaceContentData?.spaceDescription;
        if (savedDescription) {
            setSpaceDescription(savedDescription);
        }
    }, []);

    const [editSpaceName, setEditSpaceName] = useState(false)
    const [spaceName, setSpaceName] = useState(false)
    useEffect(() => {
        if (CurrentSpace)
            setSpaceName(CurrentSpace.name)
    }, [activeSpace])
    useEffect(() => {
        updateSpace(activeSpace, { name: spaceName })
        console.log('updating name', spaceName)
    }, [spaceName])
    const [userData, setUserData] = useState(null)
    const [subscribe, setSubscribe] = useState(false)
    const [searchFor, setSearchFor] = useState()
    const [searchResult, setSearchResult] = useState()
    async function search() {
        const data = await os.getData(tags.key, searchFor)
        os.log(data, 'the dt')
        if (data.success)
            setSearchResult(data.data)
    }
    useEffect(() => {
        if (searchFor) {
            // search()
        }
    }, [searchFor])
    const getUserData = async () => {
        if (!authBot?.id)
            return

        const data = await os.getData(tags.key, authBot.id);
        if (data.success) {
            const payload = data.data
            setUserData(payload)
            globalThis.SetGlobalProfilePic(payload?.photoLink)
        }
    }
    useEffect(() => {
        getUserData()
    }, [])
    return (
        <div onClick={() => setSearchResult(null)} className="settings-sidebar">

            <div className="settings-header">
                <h2>Settings</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {editMode && <button
                        onClick={() => setReSeed(false)}
                        className={`edit-mode-button ${editMode ? 'active' : ''}`}
                        title="Toggle edit mode">
                        <span className="material-symbols-outlined">
                            {editMode ? 'check' : 'edit'}
                        </span>
                    </button>}
                    <button onClick={() => setSideBarMode('default')} className="close-button">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            <div className="settings-tabs">
                <button
                    className={`tab-button ${activeTab === 'space' ? 'active' : ''}`}
                    onClick={() => setActiveTab('space')}>
                    Space Settings
                </button>
                <button
                    className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}>
                    General Settings
                </button>
            </div>

            {activeTab === 'space' ? <div className="settings-content">
                {spaceContentVisibility.spaceIcon !== false && (
                    <div className={`space-content-item ${spaceContentVisibility.spaceIcon === false ? 'hidden-item' : ''}`}>
                        {editMode && (
                            <button
                                className="hide-button space-content-hide"
                                onClick={() => toggleSpaceContentVisibility('spaceIcon')}
                                title="Hide space icon">
                                <span className="material-symbols-outlined">
                                    {spaceContentVisibility.spaceIcon === false ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        )}
                        <div className="space-details">
                            <div onClick={() => openPopupSettings(<SpaceSelector activeSpace={activeSpace} spaces={spaces} updateSpace={updateSpace} />, null, true)} className="space-icon material-symbols-outlined">
                                <div style={{ 'pointer-events': 'none' }}>
                                    {CurrentSpace?.icon || <Space />}
                                </div>
                            </div>
                            {spaceContentVisibility.spaceName !== false && (
                                <div className="space-name-container">
                                    {editMode && (
                                        <button
                                            className="hide-button space-name-hide"
                                            onClick={() => toggleSpaceContentVisibility('spaceName')}
                                            title="Hide space name">
                                            <span className="material-symbols-outlined">
                                                {spaceContentVisibility.spaceName === false ? 'visibility' : 'visibility_off'}
                                            </span>
                                        </button>
                                    )}
                                    {!editSpaceName ? <div onClick={() => setEditSpaceName(true)} className="space-name">{CurrentSpace.name}</div> : <input
                                        onBlur={() => setEditSpaceName(false)}
                                        style={{ height: '10px', width: '100px' }}
                                        id="input"
                                        value={spaceName}
                                        onChange={(e) => { setSpaceName(e.target.value) }}
                                        className="input-field number selectInput"
                                    />}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {spaceContentVisibility.spaceDescription !== false && (
                    <div className={`space-content-item ${spaceContentVisibility.spaceDescription === false ? 'hidden-item' : ''}`}>
                        {editMode && (
                            <button
                                className="hide-button space-content-hide"
                                onClick={() => toggleSpaceContentVisibility('spaceDescription')}
                                title="Hide space description">
                                <span className="material-symbols-outlined">
                                    {spaceContentVisibility.spaceDescription === false ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        )}
                        <div className="space-description">
                            {editMode && editingLabel === 'spaceDescription' ? (
                                <textarea
                                    value={spaceDescription}
                                    onChange={(e) => handleSpaceDescriptionEdit(e.target.value)}
                                    onBlur={finishEditingLabel}
                                    className="space-description-edit"
                                    autoFocus
                                    rows="3"
                                />
                            ) : (
                                <div
                                    onClick={editMode ? () => setEditingLabel('spaceDescription') : undefined}
                                    className={editMode ? 'editable-text' : ''}>
                                    {spaceDescription}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="settings-list">
                    {settingsConfig.map(({ key, label, icon, expandable, subItems, type, onClick, style, hidden }) => (
                        type === 'divider' ? (
                            <div key={key} className="settings-divider"><div className="sidebarLine"></div></div>
                        ) : (
                            <div key={key} className={`settings-item-container ${hidden ? 'hidden-item' : ''}`}>
                                <div className="settings-item-wrapper">
                                    {editMode && (
                                        <button
                                            className="hide-button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleVisibility(key);
                                            }}
                                            title={hidden ? "Show item" : "Hide item"}>
                                            <span className="material-symbols-outlined">
                                                {hidden ? 'visibility' : 'visibility_off'}
                                            </span>
                                        </button>
                                    )}
                                    <div
                                        className={`settings-item ${style} ${hidden ? 'hidden' : ''}`}
                                        onClick={expandable ? () => toggleSection(key) : onClick}>
                                        <div className="item-icon">
                                            <span className="material-symbols-outlined">{icon}</span>
                                        </div>
                                        <div className="item-text">
                                            {editMode && editingLabel === key ? (
                                                <input
                                                    type="text"
                                                    value={label}
                                                    onChange={(e) => handleLabelEdit(key, '', e.target.value)}
                                                    onBlur={finishEditingLabel}
                                                    onKeyPress={(e) => e.key === 'Enter' && finishEditingLabel()}
                                                    className="label-edit-input"
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span
                                                    onClick={editMode ? (e) => {
                                                        e.stopPropagation();
                                                        startEditingLabel(key);
                                                    } : undefined}
                                                    className={editMode ? 'editable-label' : ''}>
                                                    {label}
                                                </span>
                                            )}
                                        </div>
                                        {expandable && (
                                            <div className="item-chevron">
                                                <span className="material-symbols-outlined">
                                                    {expandedSections[key] ? 'expand_less' : 'expand_more'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {expandable && expandedSections[key] && subItems && (
                                    <div className="sub-settings-list">
                                        {subItems.map(({ key: subKey, label: subLabel, icon: subIcon, onClick, hidden: subHidden }) => (
                                            <div key={subKey} className={`settings-item-container ${subHidden ? 'hidden-item' : ''}`}>
                                                <div className="settings-item-wrapper">
                                                    {editMode && (
                                                        <button
                                                            className="hide-button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleVisibility(subKey, key);
                                                            }}
                                                            title={subHidden ? "Show item" : "Hide item"}>
                                                            <span className="material-symbols-outlined">
                                                                {subHidden ? 'visibility' : 'visibility_off'}
                                                            </span>
                                                        </button>
                                                    )}
                                                    <div
                                                        onClick={onClick}
                                                        className={`settings-item sub-item ${subHidden ? 'hidden' : ''}`}>
                                                        <div className="item-icon">
                                                            <span className="material-symbols-outlined">{subIcon}</span>
                                                        </div>
                                                        <div className="item-text">
                                                            {editMode && editingLabel === `${key}.${subKey}` ? (
                                                                <input
                                                                    type="text"
                                                                    value={subLabel}
                                                                    onChange={(e) => handleLabelEdit(subKey, key, e.target.value)}
                                                                    onBlur={finishEditingLabel}
                                                                    onKeyPress={(e) => e.key === 'Enter' && finishEditingLabel()}
                                                                    className="label-edit-input"
                                                                    autoFocus
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <span
                                                                    onClick={editMode ? (e) => {
                                                                        e.stopPropagation();
                                                                        startEditingLabel(subKey, key);
                                                                    } : undefined}
                                                                    className={editMode ? 'editable-label' : ''}>
                                                                    {subLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    ))}
                    {/*<SpaceSettingsForm />*/null}
                </div>
            </div> :
                activeTab === 'general' ? <div className="settings-content">

                    <div className="space-details">
                        <div className="space-name">General Settings</div>
                    </div>
                    <div className="space-description">
                        Manage your account, profile, and preferences..
                    </div>
                    <div className="activeAccount">
                        {userData && userData?.photoLink ? <img style={{ 'border-radius': '50%', height: '40px', width: '40px', border: '1px solid #4459F3' }} src={userData.photoLink} /> : <UserAvatar />}
                        <div className="softText">
                            Your account
                        </div>
                    </div>
                    <div style={{ "justify-content": "center" }} className="activeAccount">
                        {null/*
                        <div className="softText">
                            {userData ? "Click on account settings to modify your data" : "You don't have any active profile yet. create one to activate your account"}
                        </div>
                        <UserAvatar />
                        <img src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1745866970/crvpjzos9cdqi2d6ydvv.png" />
                        <div className="softText">
                            My Profile
                        </div>
                        */}
                    </div>
                    {!userData && <div style={{ "justify-content": "center" }} className="activeAccount">
                        <button onClick={() => { globalThis.AccountSettingsEnteredFrom = 'settings'; setSideBarMode('createAccountSettings') }} class="create-profile-btn">
                            {userData ? "Open account settings" : " + Create profile"}
                        </button>
                    </div>}
                    <div className="settings-divider"></div>
                    <div onClick={() => { globalThis.AccountSettingsEnteredFrom = 'settings'; setSideBarMode('createAccountSettings') }} className="settings-item">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                manage_accounts
                            </span>
                        </div>
                        <div className="item-text">{"Account settings"}</div>

                    </div>
                    <div className="settings-item disabled">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                rule_settings
                            </span>
                        </div>
                        <div className="item-text disabled">{"Billing & services"}</div>

                    </div>
                    <div className="settings-item disabled">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                action_key
                            </span>
                        </div>
                        <div className="item-text disabled">{"Permissions"}</div>

                    </div>
                    <div className="settings-item disabled">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                notification_settings
                            </span>
                        </div>
                        <div className="item-text disabled">{"Notifications"}</div>

                        <div className="settings-divider"></div>
                    </div>
                    <div className="settings-divider"></div>
                    <div className="activeAccount">
                        <img style={{ 'border-radius': '50%', height: '20px', width: '20px' }} src={'https://res.cloudinary.com/dfbtwwa8p/image/upload/v1751169026/517d2d9057397c32ea562a20df4640807915b4df_udws5p.png'} />
                        <div className="softText">
                            Subscriptions
                        </div>
                    </div>
                    <div style={{ "justify-content": "center" }} className="activeAccount">
                        <div className="softText">
                            {userData ? "You haven't subscribed to an account yet." : "You haven't subscribed to an account yet."}
                        </div>
                        {null/*<UserAvatar />
                        <img src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1745866970/crvpjzos9cdqi2d6ydvv.png" />
                        <div className="softText">
                            My Profile
                        </div>
                        */}
                    </div>
                    <div style={{ "justify-content": "center" }} className="activeAccount">
                        {!subscribe ? <button onClick={() => setSubscribe(true)} class="create-profile-btn">
                            Subscribe
                        </button> : <div style={{ position: '' }}>
                            <div style={{ marginBottom: '3px' }} className="blackText">Enter UID</div>
                            <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'flex-direction': 'row', gap: '20px' }}>
                                <input
                                    style={{ height: '25px' }}
                                    placeholder="e.g 34234nh23432bs243bf"
                                    className="selectInput"
                                    onChange={(e) => setSearchFor(e.target.value)}
                                />
                                <button onClick={() => search()} style={{ 'border-radius': '8px' }} class="create-profile-btn" >
                                    <span class="material-symbols-outlined">
                                        person_add
                                    </span>
                                </button>
                            </div>
                            {searchResult && <div class="profileCard" style={{ position: 'absolute', left: '300PX', top: '35%' }}>
                                <ProfileCard {...searchResult} />
                            </div>}
                            <div style={{ height: '20px' }} />
                            {null/*searchResult && <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'flex-direction': 'row', gap: '20px' }}>
                                <img style={{ 'border-radius': '50%', height: '20px', width: '20px' }} src={searchResult?.photoLink} />
                                <div>{searchResult.profileName}</div>
                            </div>
                            */
                            }
                        </div>}
                    </div>
                    <div className="settings-divider"></div>
                    <div className="settings-item disabled">
                        <div className="item-icon">
                            <span class="material-symbols-outlined disabled">
                                language
                            </span>
                        </div>
                        <div className="item-text">{"Language"}</div>

                    </div>
                    <div className="settings-item disabled">
                        <div className="item-icon">
                            <span class="material-symbols-outlined disabled">
                                face
                            </span>
                        </div>
                        <div className="item-text disabled">{"Reseed"}</div>

                    </div>
                    <div className="settings-divider"></div>

                </div> : null
            }
            <style>{`
                ${getStyleOf('settings.css')}
                
                /* Additional styles for edit mode */
                .edit-mode-button {
                    background: transparent;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: all 0.2s;
                }
                
                .edit-mode-button:hover {
                    background: #f5f5f5;
                }
                
                .edit-mode-button.active {
                    background: #4459F3;
                    color: white;
                    border-color: #4459F3;
                }
                
                .settings-item-container {
                    position: relative;
                }
                
                .settings-item-wrapper {
                    display: flex;
                    align-items: center;
                    position: relative;
                }
                
                .hide-button {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 3px;
                    z-index: 10;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                    scale:0.8;
                }
                
                .hide-button:hover {
                    opacity: 1;
                    background: #f0f0f0;
                }
                
                .hidden-item {
                    opacity: 0.5;
                }
                
                .hidden-item .settings-item {
                    background: rgba(255, 0, 0, 0.05);
                }
                
                .label-edit-input {
                    background: white;
                    border: 1px solid #4459F3;
                    border-radius: 3px;
                    padding: 2px 6px;
                    font-size: inherit;
                    font-family: inherit;
                    width: 100%;
                    min-width: 120px;
                }
                
                .editable-label {
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 3px;
                    transition: background 0.2s;
                }
                
                .editable-label:hover {
                    background: rgba(68, 89, 243, 0.1);
                }
                
                .sub-settings-list .settings-item-wrapper {
                    padding-left: 20px;
                }
                
                /* Space content specific styles */
                .space-content-item {
                    position: relative;
                    margin-bottom: 16px;
                }
                
                .space-content-hide {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    z-index: 10;
                }
                
                .space-name-container {
                    position: relative;
                    display: inline-block;
                }
                
                .space-name-hide {
                    position: absolute;
                    top: -8px;
                    right: -24px;
                }
                
                .space-description-edit {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #4459F3;
                    border-radius: 6px;
                    font-family: inherit;
                    font-size: inherit;
                    line-height: 1.4;
                    resize: vertical;
                }
                
                .editable-text {
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .editable-text:hover {
                    background: rgba(68, 89, 243, 0.1);
                }
            `}</style>
        </div>
    );
};

export default SettingsSidebar;