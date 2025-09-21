// import { useState, useEffect } from 'react';
const { useState, useEffect } = os.appHooks
import { useSideBarContext } from 'app.hooks.sideBar';
import { getStyleOf } from 'app.styles.styler';
import { MenuIcon } from 'app.components.icons';
import { TabOptions } from 'app.components.types';

const TabSettings = () => {
    const { setSideBarMode } = useSideBarContext();
    const [savedMessage, setSavedMessage] = useState('');
    const [toggles, setToggles] = useState({}); // id: boolean

    // Initialize toggles based on TabOptions
    useEffect(() => {
        const initialToggles = {};
        Object.values(TabOptions).forEach(opt => {
            initialToggles[opt.id] = opt.active;
        });
        setToggles(initialToggles);
    }, []);

    // Sync enabled items to SETOPTIONS
    useEffect(() => {
        const enabled = Object.entries(toggles).filter(([_, isEnabled]) => isEnabled).map(([id]) => id);
        if (typeof globalThis.SETOPTIONS === 'function') {
            globalThis.SETOPTIONS({
                type: 'normal',
                items: [
                    enabled.includes('Delete') && {
                        icon: <MenuIcon name="delete" />,
                        title: 'Delete tab',
                        onClick: () => {
                            removeTab(el.id);
                            closePopupSettings();
                        },
                    },
                    // Add more conditionals here as needed for other toggles
                ].filter(Boolean)
            });
        }
    }, [toggles]);
    const handleToggle = (id) => {
        const current = TabOptions[id].active;
        TabOptions[id].active = !current;

        // setToggles(prev => ({
        //     ...prev,
        //     [id]: !current
        // }));
    };


    const handleSave = () => {
        setSavedMessage('Settings saved successfully!');
    };

    return (
        <div className="tabSettings-container">
            <div className="routerOptions">
                <div onClick={() => setSideBarMode('settings')} className="blackText">
                    <MenuIcon name="arrow_back" />
                </div>
                <div className="softText">Page settings</div>
                <div className="softText"><MenuIcon name="chevron_right" /></div>
                <div className="softText">Tab</div>
            </div>

            <div className="routerTitle blackText">
                <span className="material-symbols-outlined">description</span>
                <div>Tab Settings</div>
            </div>

            <div className="mediumText">Toggle Toolbar Options</div>

            {Object.values(TabOptions).map(({ id,name }) => (
                <label key={id} className="softText" style={{ display: 'block', marginBottom: '5px' }}>
                    <input
                        type="checkbox"
                        checked={TabOptions[`${id}`]?.active}
                        onChange={() => handleToggle(id)}
                        style={{ marginRight: '5px' }}
                    />
                    {name}
                </label>
            ))}



            {savedMessage && <div className="mediumText" style={{ marginTop: '10px' }}>{savedMessage}</div>}

            <style>{getStyleOf('tabSettings.css')}</style>
        </div>
    );
};

export { TabSettings };
