const { useState, useRef, useEffect } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { MenuIcon, T, MenuDown, FormatLine, ColorSelect } from 'app.components.icons'
const { Input } = Components;
import { useTabsContext } from 'app.hooks.tabs';
import { useSideBarContext } from 'app.hooks.sideBar'
export const defaultTextConfig = {
    bookchapter: {
        font: `'Helvetica Neue', sans-serif`,
        weight: '500',
        color: 'black',
        marginVertical: '60',
        marginHorizontal: '10',
        styles: {
            bold: true,
            italic: false,
            underline: false,
            alignment: 'left',
        },
    },
    heading: {
        font: `'Montserrat', sans-serif`,
        weight: '600',
        color: 'black',
        marginVertical: '24',
        marginHorizontal: '10',
        styles: {
            bold: true,
            italic: false,
            underline: false,
            alignment: 'left',
        },
    },
    chapter: {
        font: `'Montserrat', sans-serif`,
        weight: '600',
        color: 'black',
        marginVertical: '8',
        marginHorizontal: '10',
        styles: {
            bold: true,
            italic: false,
            underline: false,
            alignment: 'left',
        },
    },
    verse: {
        font: 'EB Garamond',
        weight: '400',
        color: 'black',
        marginVertical: '30',
        marginHorizontal: '10',
        styles: {
            bold: false,
            italic: false,
            underline: false,
            alignment: 'left',
        },
    },
};
export function exportTextConfigToCSS(textConfig) {
    const toCSSVarName = (section, key) => `--text-${section}-${key}`;
    let cssVars = [];

    for (const [section, config] of Object.entries(textConfig)) {
        const styles = config.styles || {};

        cssVars.push(`${toCSSVarName(section, 'font')}: ${config.font || 'inherit'};`);
        cssVars.push(`${toCSSVarName(section, 'weight')}: ${config.weight || 'normal'};`);
        cssVars.push(`${toCSSVarName(section, 'font-style')}: ${styles.italic ? 'italic' : 'normal'};`);
        cssVars.push(`${toCSSVarName(section, 'text-decoration')}: ${styles.underline ? 'underline' : 'none'};`);
        cssVars.push(`${toCSSVarName(section, 'font-bold')}: ${styles.bold ? 'bold' : config.weight || 'normal'};`);
        cssVars.push(`${toCSSVarName(section, 'alignment')}: ${styles.alignment || 'left'};`);
        cssVars.push(`${toCSSVarName(section, 'color')}: ${config.color || 'black'};`);
        cssVars.push(`${toCSSVarName(section, 'margin-top')}: ${config.marginVertical || '16'}px;`);
        cssVars.push(`${toCSSVarName(section, 'margin-bottom')}: ${config.marginVertical || '16'}px;`);
        cssVars.push(`${toCSSVarName(section, 'margin-left')}: ${config.marginHorizontal || '0'}%;`);
        cssVars.push(`${toCSSVarName(section, 'margin-right')}: ${config.marginHorizontal || '0'}%;`);

    }

    return `:root {\n  ${cssVars.join('\n  ')}\n}`;
}
function TextSettings() {

    const { updateSpace, activeSpace, spaces } = useTabsContext()
    const { sidebarMode, setSideBarMode, closePopupSettings } = useSideBarContext()


    const [textConfig, setTextConfig] = useState({
        heading: { ...defaultTextConfig.heading },
        chapter: { ...defaultTextConfig.chapter },
        verse: { ...defaultTextConfig.verse },
        bookchapter: { ...defaultTextConfig.bookchapter },
    });



    const handleStyleChange = (section, newConfig) => {
        const updatedConfig = {
            ...textConfig,
            [section]: newConfig,
        };

        setTextConfig(updatedConfig);

        updateSpace(activeSpace, {
            settings: {
                text: {
                    root: exportTextConfigToCSS(updatedConfig),
                    data: updatedConfig
                },
            },
        });
    };
    useEffect(() => {

        setTextConfig(spaces.find(e => e.id === activeSpace)?.settings?.text?.data || defaultTextConfig)
    }, [activeSpace])
    return (
        <div className="textSettings-sidebar">
            <div className="routerOptions">
                <div style={{ cursor: 'pointer' }}  onClick={() => setSideBarMode('settings')} className="blackText"><MenuIcon name="arrow_back" /></div>
                <div className="softText">Page settings</div>
                <div className="softText"><MenuIcon name="chevron_right" /></div>
                <div className="softText">Text</div>
            </div>

            <div className="routerTitle blackText">
                <div className="blackText"><T /></div>
                <div>Text</div>
            </div>

            <div className="mediumText">Settings for Text on your page</div>

            {[`bookchapter`, 'heading',
                //  'chapter', 
                'verse'].map(section => (
                    <div key={section} className="flexColumn-10">
                        <div style={{ marginBottom: '20px' }} className="blackText">
                            {section.charAt(0).toUpperCase() + section.slice(1)} Text
                        </div>
                        <select
                            className="selectInput"
                            // value={textConfig[section].font}
                            onChange={e =>
                                handleStyleChange(section, {
                                    ...textConfig[section],
                                    font: e.target.value
                                })
                            }
                        >
                            <option selected={textConfig[section].font === 'EB Garamond'}>EB Garamond</option>
                            <option selected={textConfig[section].font === `'Helvetica Neue', sans-serif`}>Montserrat</option>
                            <option selected={textConfig[section].font === `Helvetica Neue`}>Helvetica Neue</option>
                            <option selected={textConfig[section].font === 'Roboto'}>Roboto</option>
                            <option selected={textConfig[section].font === 'Inter'}>Inter</option>
                        </select>
                        <select
                            className="selectInput"
                            value={textConfig[section].weight}
                            onChange={e =>
                                handleStyleChange(section, {
                                    ...textConfig[section],
                                    weight: e.target.value
                                })
                            }
                        >
                            <option>Bold</option>
                            <option>Regular</option>
                            <option>Light</option>
                        </select>
                        <p style={{ margin: '0' }}>
                            Margin Vertical
                        </p>
                        <Input
                            value={textConfig[section].marginVertical}
                            type="number"
                            class="selectInput"
                            onChangeListener={(val) => {
                                console.log("HERE", val, "VAL");
                                if (isNaN(val)) {
                                    return ShowNotification({ message: `Margins Can Only be Number!`, severity: "error" });
                                }
                                console.log("HERE");
                                handleStyleChange(section, {
                                    ...textConfig[section],
                                    marginVertical: val
                                })
                            }}
                            placeholder="10"
                        />
                        <p style={{ margin: '0' }}>
                            Margin Horizontal
                        </p>
                        <Input
                            value={textConfig[section].marginHorizontal}
                            type="number"
                            class="selectInput"
                            onChangeListener={(val) => {
                                console.log("HERE", val, "VAL");
                                if (isNaN(val)) {
                                    return ShowNotification({ message: `Margins Can Only be Number!`, severity: "error" });
                                }
                                console.log("HERE");
                                handleStyleChange(section, {
                                    ...textConfig[section],
                                    marginHorizontal: val
                                })

                            }}
                            placeholder="10"
                        />
                        <TextFormattingToolbar
                            sectionStyles={textConfig[section]}
                            onChange={(newConfig) => handleStyleChange(section, newConfig)}
                        />
                    </div>
                ))}

            <style>{getStyleOf('testSettings.css')}</style>
        </div>
    );
}


const TextFormattingToolbar = ({ sectionStyles, onChange }) => {
    const [showPalette, setShowPalette] = useState(false);

    const toggleStyle = (style) => {
        onChange({
            ...sectionStyles,
            styles: {
                ...sectionStyles.styles,
                [style]: !sectionStyles.styles[style]
            }
        });
    };

    const setAlignmentStyle = () => {
        const currentAlignment = sectionStyles.styles.alignment || 'left';
        const newAlignment = currentAlignment === 'left' ? 'center' : currentAlignment === 'center' ? 'right' : 'left';

        onChange({
            ...sectionStyles,
            styles: {
                ...sectionStyles.styles,
                alignment: newAlignment
            }
        });
    };

    const handleColorSelect = (color) => {
        onChange({
            ...sectionStyles,
            color
        });
        setShowPalette(false);
    };

    const colorPalette = [
        '#000000', '#4B5563', '#9CA3AF', '#D1D5DB', '#FFFFFF',
        '#DC2626', '#F97316', '#FACC15', '#16A34A', '#0EA5E9',
        '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E'
    ];

    return (
        <div className="formatting-toolbar" style={{ position: 'relative' }}>
            <button
                onClick={() => toggleStyle('bold')}
                className={`toolbar-btn ${sectionStyles.styles.bold ? 'active' : ''}`}
            >
                <MenuIcon name="format_bold" />
            </button>
            <button
                onClick={() => toggleStyle('italic')}
                className={`toolbar-btn ${sectionStyles.styles.italic ? 'active' : ''}`}
            >
                <MenuIcon name="format_italic" />
            </button>
            <button
                onClick={() => toggleStyle('underline')}
                className={`toolbar-btn ${sectionStyles.styles.underline ? 'active' : ''}`}
            >
                <MenuIcon name="format_underlined" />
            </button>

            <div className="toolbar-divider"></div>

            <div className="flexElementGap-0">
                <button
                    onClick={setAlignmentStyle}
                    className={`toolbar-btn ${sectionStyles.styles.alignment}`}
                >
                    <MenuIcon name={`format_align_${sectionStyles.styles.alignment || 'left'}`} />
                </button>
                <MenuDown />
            </div>

            <div>
                <FormatLine width={22} height={22} />
            </div>

            <div className="toolbar-divider"></div>

            <div onClick={() => setShowPalette(!showPalette)} style={{ cursor: 'pointer' }}>
                <div
                    style={{
                        width: `${16}px`,
                        height: `${16}px`,
                        backgroundColor: sectionStyles.color || '#606060',
                        borderRadius: '50%',
                        display: 'inline-block'
                    }}
                ></div>
            </div>

            {showPalette && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '50px',
                        left: '50px',
                        background: '#fff',
                        padding: '8px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 20px)',
                        gap: '8px',
                        zIndex: 10
                    }}
                >
                    {colorPalette.map(color => (
                        <div
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            style={{
                                backgroundColor: color,
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border: color === sectionStyles.color ? '2px solid #333' : '1px solid #ccc'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


export { TextSettings, TextFormattingToolbar }