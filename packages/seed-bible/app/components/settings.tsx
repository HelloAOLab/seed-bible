const { useState } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { SpaceIcon } from 'app.components.images';
import { useSideBarContext } from 'app.hooks.sideBar';
import { Space, LoadSpace, ToolbarIcon, UserAvatar } from 'app.components.icons'
import { useTabsContext } from 'app.hooks.tabs';

const SettingsSidebar = () => {
    const [activeTab, setActiveTab] = useState('space');
    const { sidebarMode, setSideBarMode } = useSideBarContext();
    const { updateSpace, activeSpace, spaces } = useTabsContext()
    const CurrentSpace = spaces.find(e => e.id === activeSpace)
    const [expandedSections, setExpandedSections] = useState({
        layers: false,
        bibleDefaults: false,
        pageSettings: true,
        canvasSettings: false,
        mapSettings: true
    });
    const settingsConfig = [
        { key: 'theme', label: 'Theme', icon: 'palette', expandable: false },
        { key: 'layers', label: 'Layers', icon: 'layers', expandable: true },
        { key: 'bibleDefaults', label: 'Bible Defaults', icon: 'book', expandable: true },
        { key: 'divider1', type: 'divider' },
        {
            key: 'pageSettings', label: 'Page Settings', icon: 'article', expandable: true, subItems: [
                { key: 'toolbar', label: 'Toolbar', icon: `construction`, onClick: () => setSideBarMode('toolbarSettings') },
                // { key: 'panel', label: 'Panel', icon: 'view_sidebar' },
                { key: 'text', label: 'Text', icon: 'text_fields', onClick: () => setSideBarMode('textSettings') },
                { key: 'extensions', label: 'Extensions', icon: 'extension' },
                { key: 'ai', label: 'AI', icon: 'smart_toy', onClick: () => setSideBarMode('aiSettings') },
            ]
        },
        { key: 'divider2', type: 'divider' },
        {
            key: 'canvasSettings', label: 'Canvas Settings', icon: 'dashboard_customize', expandable: true, subItems: [
                { key: 'toolbar', label: 'Toolbar', icon: 'build' },
                // { key: 'panel', label: 'Panel', icon: 'view_sidebar' },
                { key: 'text', label: 'Text', icon: 'text_fields' },
                { key: 'extensions', label: 'Extensions', icon: 'extension' },
                { key: 'ai', label: 'AI', icon: 'smart_toy' },
            ]
        },
        { key: 'NewMap', label: 'New Map', icon: 'map', expandable: true },
        { key: 'divider3', type: 'divider' },
        { key: 'LoadSpace', label: 'Load new space', icon: <LoadSpace />, expandable: false },
        { key: 'Share', label: 'Share', icon: 'share', expandable: false },
    ];

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="settings-sidebar">
            <div className="settings-header">
                <h2>Settings</h2>
                <button onClick={() => setSideBarMode('default')} className="close-button">
                    <span className="material-symbols-outlined">close</span>
                </button>
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
                <div className="space-details">
                    <div className="space-icon">
                        <Space />
                    </div>
                    <div className="space-name">{CurrentSpace.name}</div>
                </div>
                <div className="space-description">
                    Settings for your space. Customise toolbar, theme and add extensions.
                </div>
                <div className="settings-list">
                    {settingsConfig.map(({ key, label, icon, expandable, subItems, type }) => (
                        type === 'divider' ? (
                            <div key={key} className="settings-divider"><div className="sidebarLine"></div></div>
                        ) : (
                            <>
                                <div
                                    key={key}
                                    className="settings-item"
                                    onClick={expandable ? () => toggleSection(key) : undefined}>
                                    <div className="item-icon">
                                        <span className="material-symbols-outlined">{icon}</span>
                                    </div>
                                    <div className="item-text">{label}</div>
                                    {expandable && (
                                        <div className="item-chevron">
                                            <span className="material-symbols-outlined">
                                                {expandedSections[key] ? 'expand_less' : 'expand_more'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {expandable && expandedSections[key] && subItems && (
                                    <div className="sub-settings-list">
                                        {subItems.map(({ key: subKey, label: subLabel, icon: subIcon, onClick }) => (
                                            <div onClick={onClick} key={subKey} className="settings-item sub-item">
                                                <div className="item-icon">
                                                    <span className="material-symbols-outlined">{subIcon}</span>
                                                </div>
                                                <div className="item-text">{subLabel}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )
                    ))}
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
                        <UserAvatar />
                        <div className="softText">
                        Active account
                        </div>
                    </div>
                    <div className="activeAccount">
                        {null/*<UserAvatar />*/}
                        <img src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1745866970/crvpjzos9cdqi2d6ydvv.png"/>
                        <div className="softText">
                        My Profile
                        </div>
                    </div>
                    <div className="settings-divider"></div>
                    <div className="settings-item">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                manage_accounts
                            </span>
                        </div>
                        <div className="item-text">{"Account settings"}</div>

                    </div>
                    <div className="settings-item">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                rule_settings
                            </span>
                        </div>
                        <div className="item-text">{"Billing & services"}</div>

                    </div>
                    <div className="settings-item">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                action_key
                            </span>
                        </div>
                        <div className="item-text">{"Permissions"}</div>

                    </div>
                    <div className="settings-item">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                notification_settings
                            </span>
                        </div>
                        <div className="item-text">{"Notifications"}</div>

                            <div className="settings-divider"></div>
            </div>
                    <div className="settings-item">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                language
                            </span>
                        </div>
                        <div className="item-text">{"Language"}</div>

                    </div>
                    <div className="settings-divider"></div>
                    <div className="settings-item">
                        <div className="item-icon">
                            <span class="material-symbols-outlined">
                                face
                            </span>
                        </div>
                        <div className="item-text">{"Reseed"}</div>

                    </div>
                    <div className="settings-divider"></div>
                    
                </div> : null
            }
            <style>{getStyleOf('settings.css')}</style>
        </div>
    );
};

export default SettingsSidebar;
