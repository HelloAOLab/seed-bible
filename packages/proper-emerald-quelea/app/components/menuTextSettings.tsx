// import { useState, useEffect } from 'react';
const { useState } = os.appHooks
import { getStyleOf } from 'app.styles.styler';
import { useSideBarContext } from 'app.hooks.sideBar'
import { MenuIcon, T, MenuDown, FormatLine, ColorSelect } from 'app.components.icons'

const defaultSimpleConfig = {
    font: 'Inter',
    weight: '400',
    size: '16',
    color: '#000000',
};

const fontOptions = ['Inter', 'Roboto', 'EB Garamond', 'Helvetica Neue', 'Montserrat'];
const weightOptions = ['100', '300', '400', '500', '600', '700', '900'];
const fontSizes = ['12', '14', '16', '18', '20', '24', '28', '32'];

function MenuTextSettings({ onChange }) {
    const [config, setConfig] = useState(defaultSimpleConfig);

    const handleChange = (key, value) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        if (onChange) onChange(newConfig);
    };
    const { sidebarMode, setSideBarMode, closePopupSettings } = useSideBarContext()
    return (
        <div className="textSettings-sidebar">
            <div className="routerOptions">
                <div style={{ cursor: 'pointer' }} onClick={() => setSideBarMode('settings')} className="blackText"><MenuIcon name="arrow_back" /></div>
                <div className="softText">Page settings</div>
                <div className="softText"><MenuIcon name="chevron_right" /></div>
                <div className="softText">Text</div>
            </div>

            <div className="routerTitle blackText">
                <div className="blackText"><T /></div>
                <div>Text</div>
            </div>
            <h3>Text Settings</h3>

            <label>Font Family</label>
            <select
                className="selectInput"
                value={config.font}
                onChange={(e) => handleChange('font', e.target.value)}
            >
                {fontOptions.map(font => (
                    <option key={font} value={font}>{font}</option>
                ))}
            </select>

            <label>Font Weight</label>
            <select
                className="selectInput"
                value={config.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
            >
                {weightOptions.map(weight => (
                    <option key={weight} value={weight}>{weight}</option>
                ))}
            </select>

            <label>Font Size (px)</label>
            <select
                className="selectInput"
                value={config.size}
                onChange={(e) => handleChange('size', e.target.value)}
            >
                {fontSizes.map(size => (
                    <option key={size} value={size}>{size}px</option>
                ))}
            </select>



            <style>
                {`
                .menu-text-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.selectInput {
  padding: 6px 8px;
  font-size: 14px;
  border-radius: 4px;
}

                `}
            </style>
            <style>{getStyleOf('testSettings.css')}</style>
        </div>
    );
}


export { MenuTextSettings }