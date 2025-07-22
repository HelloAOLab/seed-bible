const { useState, useEffect } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { SpaceIcon } from 'app.components.images';
import { ProfileCard } from 'app.components.profileCard';
import { useSideBarContext } from 'app.hooks.sideBar';
import { Space, LoadSpace, ToolbarIcon, UserAvatar } from 'app.components.icons'
import { useTabsContext } from 'app.hooks.tabs';
import {
    SpaceSettingsForm,
    SpaceSelector
} from 'app.components.spaceSettings'
const SettingsSidebar = () => {
    const [activeTab, setActiveTab] = useState('space');
    globalThis.SetActiveSettingsTab = setActiveTab
    const { sidebarMode, setSideBarMode } = useSideBarContext();
    const { openPopupSettings, closePopupSettings } = useSideBarContext();
    const { updateSpace, activeSpace, spaces, downloadSpaceAsJSON,replaceActiveSpaceWithJSON  } = useTabsContext()
    const CurrentSpace = spaces.find(e => e.id === activeSpace)
    const [expandedSections, setExpandedSections] = useState({
        layers: false,
        bibleDefaults: false,
        pageSettings: true,
        canvasSettings: false,
        mapSettings: true
    });
    const settingsConfig = [
        { key: 'theme', label: 'Theme', icon: 'palette', expandable: false, onClick: () => setSideBarMode('themeSettings') },
        { key: 'layers', label: 'Layers', icon: 'layers',style:'disabled', expandable: true },
        { key: 'bibleDefaults', label: 'Bible Defaults',style:'disabled', icon: 'book', expandable: true },
        { key: 'divider1', type: 'divider' },
        {
            key: 'pageSettings', label: 'Page Settings', icon: 'article', expandable: true, subItems: [
                { key: 'toolbar', label: 'Toolbar', icon: `construction`, onClick: () => setSideBarMode('toolbarSettings-Page') },
                // { key: 'panel', label: 'Panel', icon: 'view_sidebar' },
                { key: 'text', label: 'Text', icon: 'text_fields', onClick: () => setSideBarMode('textSettings') },
                { key: 'extensions', label: 'Extensions', icon: 'extension' },
                { key: 'ai', label: 'AI', icon: 'smart_toy', onClick: () => setSideBarMode('aiSettings') },
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
        // { key: 'divider2', type: 'divider' },
        // {
        //     key: 'NewMap', label: 'Map Settings', icon: 'map', expandable: true, subItems: [
        //         { key: 'toolbar', label: 'Toolbar', icon: `construction`, onClick: () => setSideBarMode('toolbarSettings-Map') },
        //         // { key: 'panel', label: 'Panel', icon: 'view_sidebar' },
        //         // { key: 'text', label: 'Text', icon: 'text_fields', onClick: () => setSideBarMode('textSettings') },
        //         // { key: 'extensions', label: 'Extensions', icon: 'extension' },
        //         // { key: 'ai', label: 'AI', icon: 'smart_toy', onClick: () => setSideBarMode('aiSettings') },
        //     ]
        // },
        { key: 'divider3', type: 'divider' },
        {
            key: 'LoadSpace', label: 'Load new space', icon: <LoadSpace />, expandable: false, onClick: async () => {
                // downloadSpaceAsJSON(CurrentSpace.id)
                const files = await os.showUploadFiles()
                if (files.length !== 0) {
                    const file = files[0]
                    replaceActiveSpaceWithJSON(file, CurrentSpace.id)
                }

            }
        },
        {
            key: 'LoadSpace', label: 'Download space', icon: 'download', expandable: false, onClick: () => {
                downloadSpaceAsJSON(CurrentSpace.id)
            }
        },
        { key: 'Share', label: 'Share', icon: 'share', expandable: false },
    ];

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };
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
                    <div onClick={() => openPopupSettings(<SpaceSelector />, null, true)} className="space-icon material-symbols-outlined">
                        {CurrentSpace?.icon || <Space />}
                    </div>
                    {!editSpaceName ? <div onClick={() => setEditSpaceName(true)} className="space-name">{CurrentSpace.name}</div> : <input
                        onBlur={() => setEditSpaceName(false)}
                        style={{ height: '10px', width: '100px' }}
                        // type="number"
                        id="input"
                        value={spaceName}
                        onChange={(e) => { setSpaceName(e.target.value) }}
                        className="input-field number selectInput"
                    />}
                </div>
                <div className="space-description">
                   Settings for your space. Customize the toolbar, theme, text, and more. An extension store with more capability will be available at a later date.
                </div>
                <div className="settings-list">
                    {settingsConfig.map(({ key, label, icon, expandable, subItems, type, onClick,style }) => (
                        type === 'divider' ? (
                            <div key={key} className="settings-divider"><div className="sidebarLine"></div></div>
                        ) : (
                            <>
                                <div
                                    key={key}
                                    className={`settings-item ${style}`}
                                    onClick={expandable ? () => toggleSection(key) : onClick}>
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
                            {userData ? "Click on account settings to modify your data" : "You don’t have any active profile yet. create one to activate your account"}
                        </div>
                        <UserAvatar />
                        <img src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1745866970/crvpjzos9cdqi2d6ydvv.png" />
                        <div className="softText">
                            My Profile
                        </div>
                        */}
                    </div>
                   {!userData&& <div style={{ "justify-content": "center" }} className="activeAccount">
                        <button onClick={() =>{globalThis.AccountSettingsEnteredFrom = 'settings'; setSideBarMode('createAccountSettings')}} class="create-profile-btn">
                            {userData ? "Open account settings" : " + Create profile"}
                        </button>
                    </div>}
                    <div className="settings-divider"></div>
                    <div onClick={() =>{globalThis.AccountSettingsEnteredFrom = 'settings'; setSideBarMode('createAccountSettings')}} className="settings-item">
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
            <style>{getStyleOf('settings.css')}</style>
        </div>
    );
};

export default SettingsSidebar;
