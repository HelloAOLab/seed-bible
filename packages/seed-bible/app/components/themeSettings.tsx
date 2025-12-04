const { useEffect, useState, useRef } = os.appHooks;
import { getStyleOf } from "app.styles.styler";
import { MenuIcon, ThemeIcon } from "app.components.icons";
import { useTabsContext } from "app.hooks.tabs";
import { useSideBarContext } from "app.hooks.sideBar";
import { useBibleContext } from "app.hooks.bibleVariables";

// ————————————————————————————————————————————————————————————
// Fields shown in the screenshot, rendered dynamically below
// ————————————————————————————————————————————————————————————
const COLOR_FIELDS = [
  { label: "Menu Background", field: "menuBackground" }, 
  { label: "Page Background", field: "pageBackground" }, 
  { label: "Page text color", field: "pageTextColor" }, 
  { label: "Icons color", field: "iconColor" }, 
  { label: "Primary button background", field: "primaryButton" },
  { label: "Primary button text", field: "primaryButtonColor" },
  { label: "Secondary button background", field: "secondaryButton" },
  { label: "Secondary button text", field: "secondaryButton" },
  { label: "Button border", field: "buttonBorder" },
  { label: "Tab Selection", field: "tabSelection" },
  { label: "Space selection", field: "spaceSelection" },
  { label: "Toolbar background", field: "toolbarBackground" },
  { label: "Primary text", field: "text1" },
  { label: "Secondary text", field: "text2" },
];

// Keep text colors to style the labels (not shown as editable rows here)
const defaultTheme = {
  menuBackground: "#F0F1F1",
  primaryButton: "#E6E6E6",
  pageBackground: "#FFFFFF",
  pageTextColor: "#000000",
  primaryButtonColor: "#606060",
  secondaryButton: "#4459F34D",
  secondaryButtonColor: "#4459F3",
  buttonBorder: "#2b00ff",
  tabSelection: "#4459F3",
  spaceSelection: "#4459F3",
  toolbarBackground: "#ffffff",
  iconColor: "#000000",
  text1: "#000000",
  text2: "#000000",
  showTabIcons: true, // Default to showing tab icons
};

// ————————————————————————————————————————————————————————————
// Ready Themes Collection
// ————————————————————————————————————————————————————————————
const READY_THEMES = [
  {
    name: "Default",
    colors: defaultTheme,
  },
  {
    name: "Dark Mode",
    colors: {
      menuBackground: "#2D2D2D",
      primaryButton: "#404040",
      primaryButtonColor: "#FFFFFF",
      secondaryButton: "#5A67D8",
      secondaryButtonColor: "#FFFFFF",
      buttonBorder: "#5A67D8",
      tabSelection: "#5A67D8",
      spaceSelection: "#5A67D8",
      toolbarBackground: "#1A1A1A",
      text1: "#FFFFFF",
      text2: "#FFFFFF",
      iconColor: "#FFFFFF",
      "filter-mode": "invert(100%)",
      pageBackground: "#121212",
      pageTextColor: "white",
      showTabIcons: true,
    },
  },
   {
    name: 'Purple Serenity',
    colors: {
      menuBackground: '#9C27B0',
      toolbarBackground: '#E1BEE7',
      text1: '#4A148C',
      text2: '#7B1FA2',
      iconColor:"#be0e14ff"
    }
  },
  // {
  //   name: 'Gray Classic',
  //   colors: {
  //     menuBackground: '#535353',
  //     toolbarBackground: '#E0E0E0',
  //     text1: '#212121',
  //     text2: '#424242'
  //   }
  // },
  {
    name: 'Green Nature',
    colors: {
      menuBackground: '#80B027',
      toolbarBackground: '#DCEDC8',
      text1: '#33691E',
      text2: '#689F38'
    }
  },
  {
    name: 'Ocean Blue',
    colors: {
      menuBackground: '#1976D2',
      toolbarBackground: '#BBDEFB',
      text1: '#0D47A1',
      text2: '#1565C0'
    }
  },
  {
    name: 'Warm Amber',
    colors: {
      menuBackground: '#F57C00',
      toolbarBackground: '#FFE0B2',
      text1: '#E65100',
      text2: '#EF6C00'
    }
  }
];

// ----------- DEBOUNCE (no CDN needed) -----------
function debounce(fn, delay = 250) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// ----------- CACHE -----------
const filterCache = new Map();

class Color {
  constructor(r, g, b) { this.set(r, g, b); }
  set(r, g, b) {
    this.r = this.clamp(r); this.g = this.clamp(g); this.b = this.clamp(b);
  }
  clamp(v) { return Math.max(0, Math.min(255, v)); }
  multiply(m) {
    const r = this.r, g = this.g, b = this.b;
    this.r = this.clamp(r * m[0] + g * m[1] + b * m[2]);
    this.g = this.clamp(r * m[3] + g * m[4] + b * m[5]);
    this.b = this.clamp(r * m[6] + g * m[7] + b * m[8]);
  }
  invert(v = 1) {
    this.r = this.clamp((v + this.r / 255 * (1 - 2 * v)) * 255);
    this.g = this.clamp((v + this.g / 255 * (1 - 2 * v)) * 255);
    this.b = this.clamp((v + this.b / 255 * (1 - 2 * v)) * 255);
  }
  sepia(v = 1) { this.multiply([
    0.393 + 0.607*(1-v), 0.769 - 0.769*(1-v), 0.189 - 0.189*(1-v),
    0.349 - 0.349*(1-v), 0.686 + 0.314*(1-v), 0.168 - 0.168*(1-v),
    0.272 - 0.272*(1-v), 0.534 - 0.534*(1-v), 0.131 + 0.869*(1-v)
  ]); }
  saturate(v = 1) { this.multiply([
    0.213 + 0.787*v, 0.715 - 0.715*v, 0.072 - 0.072*v,
    0.213 - 0.213*v, 0.715 + 0.285*v, 0.072 - 0.072*v,
    0.213 - 0.213*v, 0.715 - 0.715*v, 0.072 + 0.928*v
  ]); }
  hueRotate(angle = 0) {
    const rad = angle * Math.PI/180, sin = Math.sin(rad), cos = Math.cos(rad);
    this.multiply([
      0.213 + cos*0.787 - sin*0.213,
      0.715 - cos*0.715 - sin*0.715,
      0.072 - cos*0.072 + sin*0.928,
      0.213 - cos*0.213 + sin*0.143,
      0.715 + cos*0.285 + sin*0.140,
      0.072 - cos*0.072 - sin*0.283,
      0.213 - cos*0.213 - sin*0.787,
      0.715 - cos*0.715 + sin*0.715,
      0.072 + cos*0.928 + sin*0.072
    ]);
  }
  brightness(v=1){ this.linear(v); }
  contrast(v=1){ this.linear(v, -(0.5*v)+0.5); }
  linear(s=1, i=0){
    this.r = this.clamp(this.r*s + i*255);
    this.g = this.clamp(this.g*s + i*255);
    this.b = this.clamp(this.b*s + i*255);
  }
  hsl() {
    const r=this.r/255,g=this.g/255,b=this.b/255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    let h,s,l=(max+min)/2;
    if(max===min){h=s=0;} else{
      const d=max-min;
      s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){
        case r:h=(g-b)/d+(g<b?6:0);break;
        case g:h=(b-r)/d+2;break;
        case b:h=(r-g)/d+4;break;
      }
      h/=6;
    }
    return {h:h*100,s:s*100,l:l*100};
  }
}

// ======================
//   OPTIMIZED SOLVER ENGINE
// ======================
class Solver {
  constructor(target) {
    this.target = target;
    this.targetHSL = target.hsl();
    this.tmp = new Color(0, 0, 0);
  }

  solve() {
    const wide = this.solveWide();
    const narrow = this.solveNarrow(wide);
    return this.css(narrow.values);
  }

  // greatly reduced iteration count
  solveWide() {
    const A = 5, c = 15;
    const a = [60, 180, 18000, 600, 1.2, 1.2];
    const initial = [50, 20, 3750, 50, 100, 100];
    return this.spsa(A, a, c, initial, 30);  // ← was 150
  }

  solveNarrow(wide) {
    const A = wide.loss, c = 2;
    const A1 = A + 1;
    const a = [
      0.25*A1, 0.25*A1, A1, 0.25*A1, 0.2*A1, 0.2*A1
    ];
    return this.spsa(A, a, c, wide.values, 15); // ← was 80
  }

  spsa(A, a, c, values, iters) {
    const alpha = 1, gamma = 0.166666;
    let best = values.slice(), bestLoss = Infinity;

    const t = this.tmp;

    for (let k = 0; k < iters; k++) {
      const ck = c / Math.pow(k+1, gamma);
      const high=[],low=[],delta=[];

      for(let i=0;i<6;i++){
        delta[i] = Math.random()>0.5 ? 1 : -1;
        high[i] = values[i] + ck*delta[i];
        low[i]  = values[i] - ck*delta[i];
      }

      const diff = this.loss(high) - this.loss(low);

      for (let i=0;i<6;i++){
        const g = diff/(2*ck)*delta[i];
        const ak = a[i] / Math.pow(A + k + 1, alpha);
        values[i] = this.fix(values[i] - ak*g, i);
      }

      const loss = this.loss(values);
      if (loss < bestLoss){ bestLoss = loss; best = values.slice(); }
    }

    return { values: best, loss: bestLoss };
  }

  fix(v, idx) {
    const max = [100,100,7500,100,200,200][idx];
    if (idx === 3) return ((v % max) + max) % max;
    return Math.max(0, Math.min(max, v));
  }

  loss(filters) {
    const c = this.tmp;
    c.set(0,0,0);
    c.invert(filters[0]/100);
    c.sepia(filters[1]/100);
    c.saturate(filters[2]/100);
    c.hueRotate(filters[3]*3.6);
    c.brightness(filters[4]/100);
    c.contrast(filters[5]/100);

    const hsl = c.hsl();
    return Math.abs(c.r - this.target.r)
         + Math.abs(c.g - this.target.g)
         + Math.abs(c.b - this.target.b)
         + Math.abs(hsl.h - this.targetHSL.h)
         + Math.abs(hsl.s - this.targetHSL.s)
         + Math.abs(hsl.l - this.targetHSL.l);
  }

  css(f) {
    return `invert(${Math.round(f[0])}%) sepia(${Math.round(f[1])}%)
            saturate(${Math.round(f[2])}%) hue-rotate(${Math.round(f[3]*3.6)}deg)
            brightness(${Math.round(f[4])}%) contrast(${Math.round(f[5])}%);`;
  }
}



// ======================
//   HEX → FILTER FUNCTION
// ======================
function hexToColor(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map(x => x + x).join("");

  const num = parseInt(hex, 16);
  return new Color(
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255
  );
}

function getColorFilterCached(hex) {
  if (filterCache.has(hex)) return filterCache.get(hex);

  const color = hexToColor(hex);
  const solver = new Solver(color);
  const css = solver.solve();

  filterCache.set(hex, css);
  return css;
}
const debouncedSolve = debounce((hex, callback) => {
  callback(getColorFilterCached(hex));
}, 250);


const ThemeSettings = () => {
  const { updateSpace, activeSpace, currentSpace, tabsIcons, setTabsIcons } =
    useTabsContext();
  const { setSideBarMode, closePopupSettings, setThemeColors, themeColors } =
    useSideBarContext();

  const [changesSaved, setChagesSaved] = useState(false);
  const [colorsMap, setColorsMap] = useState({});
  const [originalColorsMap, setOriginalColorsMap] = useState({});

  // Initialize CurrentColors on mount
  useEffect(() => {
    globalThis.CurrentColors = themeColors?.[`${activeSpace}`] || defaultTheme;
  }, []);

  // Resolve the working colors: local edits -> sidebar state -> default
  const colors =
    colorsMap?.[activeSpace] || themeColors?.[activeSpace] || defaultTheme;

  const labelColor = colors?.text1 || "#606060";
const handleColorChange = (field, e) => {
  const newColor = e.target.value;
  // setChagesSaved(false);

  if (field === "toolbarBackground") {
    globalThis.SetToolbarBackground?.(newColor);
  }

  debouncedSolve(newColor, (filter) => {
    const updatedColors = {
      ...colors,
      [field]: newColor,
      ["filter-mode"]: filter,
    };

    setColorsMap(prev => ({ ...prev, [activeSpace]: updatedColors }));
    setThemeColors(prev => ({ ...prev, [activeSpace]: updatedColors }));
    updateSpace(activeSpace, { themeColors: updatedColors });
  });
};


  // ————————————————————————————————————————————————————————————
  // Handle Tab Icons Toggle
  // ————————————————————————————————————————————————————————————
  const handleTabIconsToggle = () => {
    setTabsIcons(!tabsIcons);
  };

  // ————————————————————————————————————————————————————————————
  // Apply Ready Theme
  // ————————————————————————————————————————————————————————————
  const applyReadyTheme = (themeColors) => {
    setChagesSaved(false);

    // Apply toolbar background side-effect if needed
    if (themeColors.toolbarBackground) {
      globalThis.SetToolbarBackground?.(themeColors.toolbarBackground);
    }
      let filterMode 
      console.log("computed filter for icon color",themeColors)
      if(themeColors['iconColor'] ){
        filterMode = getColorFilterCached(themeColors['iconColor'])
      }
    // Update local map
    setColorsMap((prev) => ({
      ...prev,
      [activeSpace]:filterMode? {...themeColors,"filter-mode":filterMode}:themeColors,
    }));

    // Update sidebar theme state (immediate apply)
    setThemeColors((prev) => ({ ...prev, [activeSpace]: themeColors }));

    // Persist to the space
    updateSpace(activeSpace, { themeColors });
  };

  // When switching spaces without saving, restore the last committed theme for that space
  useEffect(() => {
    if (!changesSaved) {
      setThemeColors((prev) => ({
        ...prev,
        [activeSpace]: globalThis.CurrentColors,
      }));
    }
  }, [activeSpace]);
// useEffect(() => {

//     applyReadyTheme(defaultTheme);

// }, []);

  return (
    <div className="themeSettings-container">
      <div className="routerOptions">
        <div
          onClick={() => {
            if (!changesSaved) {
              setThemeColors((prev) => ({
                ...prev,
                [activeSpace]: globalThis.CurrentColors,
              }));
            }
            setSideBarMode("themeSettings");
          }}
          style={{ cursor: "pointer" }}
          className="blackText"
        >
          <MenuIcon name="arrow_back" />
        </div>
        <div className="softText">Theme</div>
        <div className="softText">
          <MenuIcon name="chevron_right" />
        </div>
        <div className="softText">Advanced Theme Settings</div>
      </div>

      <div className="routerTitle blackText">
        <div className="blackText">
          <ThemeIcon />
        </div>
        <div>{currentSpace.name} Theme</div>
      </div>

      <div style={{ height: 25 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        {COLOR_FIELDS.map((cfg) => (
          <ColorRow
            key={cfg.field}
            label={cfg.label}
            field={cfg.field}
            value={colors?.[cfg.field]}
            labelColor={labelColor}
            onChange={handleColorChange}
          />
        ))}
      </div>

      <div style={{ height: 15 }} />
      <div className="sidebarLine" />
      <div style={{ height: 15 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 34,
        }}
      >
        <div
          style={{
            color: labelColor,
            fontFamily: "Open Sans",
            fontSize: 16,
            fontStyle: "normal",
            fontWeight: 600,
            lineHeight: "normal",
          }}
        >
          Show Tab Icons
        </div>
        <div
          onClick={handleTabIconsToggle}
          style={{
            width: 48,
            height: 24,
            backgroundColor: tabsIcons ? colors.tabSelection : "#CCCCCC",
            borderRadius: 12,
            cursor: "pointer",
            position: "relative",
            transition: "background-color 0.3s ease",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: "#FFFFFF",
              borderRadius: "50%",
              position: "absolute",
              top: 2,
              left: tabsIcons ? 26 : 2,
              transition: "left 0.3s ease",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
            }}
          />
        </div>
      </div>

      <div className="sidebarLine" />
      {null/*<div style={{ height: 15 }} />
      <div className="readyThemes-section">
        <div
          className="themeText"
          style={{
            marginBottom: 15,
            color: labelColor,
          }}
        >
          Themes
        </div>

        <div className="readyThemes-list">
          {READY_THEMES.map((theme, index) => (
            <div
              key={index}
              className="readyTheme-item"
              onClick={() => applyReadyTheme(theme.colors)}
            >
              <div className="readyTheme-preview">
                <div
                  className="theme-color-preview"
                  style={{ backgroundColor: theme.colors.menuBackground }}
                />
                <div
                  className="theme-color-preview"
                  style={{ backgroundColor: theme.colors.primaryButton }}
                />
                <div
                  className="theme-color-preview"
                  style={{ backgroundColor: theme.colors.secondaryButton }}
                />
              </div>
              <div className="readyTheme-name" style={{ color: labelColor }}>
                {theme.name}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 15 }} />
      <div className="sidebarLine" />
      <div style={{ height: 15 }} />
      */}

      <button
        onClick={() => {
          os.toast("changes saved");
          setChagesSaved(true);
          // capture the latest committed theme as "CurrentColors"
          globalThis.CurrentColors = themeColors?.[activeSpace] || colors;
        }}
        className="themeButton"
      >
        Save changes
      </button>

      <div style={{ height: 20 }} />

      <div style={{ height: "100px" }}></div>

      <style>{getStyleOf("themeSettings.css")}</style>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Dynamic ColorRow (single component used for all rows)
// ————————————————————————————————————————————————————————————
const ColorRow = ({ label, field, value, labelColor, onChange }) => {
  const inputRef = useRef(null);
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: labelColor,
            fontFamily: "Open Sans",
            fontSize: 16,
            fontStyle: "normal",
            fontWeight: 600,
            lineHeight: "normal",
          }}
        >
          {label}
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            aspectRatio: "1 / 1",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <svg
          // className='coloredIcon'
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="11.5"
              fill={value || "#868686"}
              stroke="black"
            />
          </svg>
          <input
            ref={inputRef}
            style={{
              opacity: 0,
              position: "absolute",
              inset: 0,
              cursor: "pointer",
            }}
            type="color"
            value={value || "#ffffff"}
            onChange={(e) => onChange(field, e)}
          />
        </div>
      </div>
    </>
  );
};

const FONT_OPTIONS = [
  { name: 'DM Sans', value: 'DM Sans, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Merriweather', value: 'Merriweather, serif' }
];

const FONT_SIZES = [
  { label: 'Small', value: '14' },
  { label: 'Medium', value: '16' },
  { label: 'Large', value: '18' },
  { label: 'Extra Large', value: '20' },
  { label: 'Extra Large', value: '24' },
  { label: 'Extra Large', value: '28' },
];

const SURPRISE_COMBINATIONS = [
  {
    font: 'Georgia, serif',
    fontSize: '16px',
    theme: 0
  },
  {
    font: 'Merriweather, serif',
    fontSize: '18px',
    theme: 2
  },
  {
    font: 'DM Sans, sans-serif',
    fontSize: '16px',
    theme: 3
  },
  {
    font: 'Georgia, serif',
    fontSize: '18px',
    theme: 4
  },
  {
    font: 'Merriweather, serif',
    fontSize: '16px',
    theme: 1
  },
  {
    font: 'DM Sans, sans-serif',
    fontSize: '20px',
    theme: 2
  },
  {
    font: 'Georgia, serif',
    fontSize: '20px',
    theme: 0
  }
];

 function buildTextConfigUpdate(section, fontFamily, fontSize, currentConfig) {
    if (!currentConfig) {
        console.error("currentConfig is required for buildTextConfigUpdate");
        return;
    }

    // clone config
    const updatedConfig = JSON.parse(JSON.stringify(currentConfig));

    // apply new font settings
    updatedConfig[section].font = fontFamily;
    updatedConfig[section].fontSize = fontSize;   // if you want to use size
    updatedConfig[section].size = fontSize;       // in case you prefer `size` key

    // rebuild CSS variables using your existing exporter
    const cssVars = exportTextConfigToCSS(updatedConfig);

    return {
        settings: {
            text: {
                root: cssVars,
                data: updatedConfig
            }
        }
    };
}
export function exportTextConfigToCSS(textConfig) {
    const toCSSVarName = (section, key) => `--text-${section}-${key}`;
    const cssVars = [];

    for (const [section, config] of Object.entries(textConfig)) {
        const styles = config.styles || {};
        cssVars.push(`${toCSSVarName(section, 'line-height')}: ${config.lineHeight || 'normal'};`);
        cssVars.push(`${toCSSVarName(section, 'font')}: ${config.font || 'inherit'};`);
        cssVars.push(`${toCSSVarName(section, 'weight')}: ${config.weight || 'normal'};`);
        cssVars.push(`${toCSSVarName(section, 'font-style')}: ${styles.italic ? 'italic' : 'normal'};`);
        cssVars.push(`${toCSSVarName(section, 'text-decoration')}: ${styles.underline ? 'underline' : 'none'};`);
        cssVars.push(`${toCSSVarName(section, 'font-bold')}: ${styles.bold ? 'bold' : config.weight || 'normal'};`);
        cssVars.push(`${toCSSVarName(section, 'alignment')}: ${styles.alignment || 'left'};`);
        cssVars.push(`${toCSSVarName(section, 'color')}: ${config.color || 'black'};`);
        cssVars.push(`${toCSSVarName(section, 'margin-top')}: ${config.marginTop || config.marginVertical || '16'}px;`);
        cssVars.push(`${toCSSVarName(section, 'margin-bottom')}: ${config.marginBottom || config.marginVertical || '16'}px;`);
        cssVars.push(`${toCSSVarName(section, 'margin-left')}: ${config.marginHorizontal || '0'}%;`);
        cssVars.push(`${toCSSVarName(section, 'margin-right')}: ${config.marginHorizontal || '0'}%;`);
        cssVars.push(`${toCSSVarName(section, 'font-size')}: ${config.fontSize || config.size || '16'}px;`);


    }

    return `:root {\n  ${cssVars.join('\n  ')}\n}`;
}
export const defaultTextConfig = {
    bookchapter: {
        font: `'Newsreader', serif`,
        weight: '600',
        color: 'black',
        marginVertical: '0',
        marginHorizontal: '27',
        styles: {
            bold: true,
            italic: false,
            underline: false,
            alignment: 'left',
        },
    },
    heading: {
        font: `'Plus Jakarta Sans', sans-serif`,
        weight: '200',
        color: 'black',
        marginTop: '18',
        marginBottom: '12',
        marginHorizontal: '27',
        styles: {
            bold: false,
            italic: true,
            underline: false,
            alignment: 'left',
        },
    },
    chapter: {
        font: `'Newsreader', serif`,
        weight: '600',
        color: 'black',
        marginVertical: '8',
        marginHorizontal: '27',
        styles: {
            bold: true,
            italic: false,
            underline: false,
            alignment: 'left',
        },
    },
    verse: {
        font: `'Newsreader', serif`,
        weight: '400',
        color: 'black',
        "font-size": '20',
        marginVertical: '30',
        marginHorizontal: '27',
        styles: {
            bold: false,
            italic: false,
            underline: false,
            alignment: 'left',
        },
    },
};
const SettingsUI = () => {
  const [showCapturedText, setShowCapturedText] = useState(true);
  const [showVersusText, setShowVersusText] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [selectedFont, setSelectedFont] = useState(0);
  const [selectedFontSize, setSelectedFontSize] = useState(1);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const {setShowHeading,setShowVerses,showHeading,showVerses} = useBibleContext();
  const handleSurpriseMe = () => {
    const randomCombo = SURPRISE_COMBINATIONS[Math.floor(Math.random() * SURPRISE_COMBINATIONS.length)];
    setSelectedTheme(randomCombo.theme);
    const fontIndex = FONT_OPTIONS.findIndex(f => f.value === randomCombo.font);
    setSelectedFont(fontIndex);
    const sizeIndex = FONT_SIZES.findIndex(s => s.value === randomCombo.fontSize);
    setSelectedFontSize(sizeIndex);
  };
    const { updateSpace, activeSpace, currentSpace, tabsIcons, setTabsIcons } =
    useTabsContext();
  const { setSideBarMode, closePopupSettings, setThemeColors, themeColors } =
    useSideBarContext();

  const [changesSaved, setChagesSaved] = useState(false);
  const [colorsMap, setColorsMap] = useState({});
  const [originalColorsMap, setOriginalColorsMap] = useState({});

  // Initialize CurrentColors on mount
  useEffect(() => {
    globalThis.CurrentColors = themeColors?.[`${activeSpace}`] || defaultTheme;
  }, []);

  // Resolve the working colors: local edits -> sidebar state -> default
  const colors =
    colorsMap?.[activeSpace] || themeColors?.[activeSpace] || defaultTheme;

  const labelColor = colors?.text1 || "#606060";
const handleColorChange = (field, e) => {
  const newColor = e.target.value;
  setChagesSaved(false);

  if (field === "toolbarBackground") {
    globalThis.SetToolbarBackground?.(newColor);
  }

  debouncedSolve(newColor, (filter) => {
    const updatedColors = {
      ...colors,
      [field]: newColor,
      ["filter-mode"]: filter,
    };

    setColorsMap(prev => ({ ...prev, [activeSpace]: updatedColors }));
    setThemeColors(prev => ({ ...prev, [activeSpace]: updatedColors }));
    updateSpace(activeSpace, { themeColors: updatedColors });
  });
};


  // ————————————————————————————————————————————————————————————
  // Handle Tab Icons Toggle
  // ————————————————————————————————————————————————————————————
  const handleTabIconsToggle = () => {
    setTabsIcons(!tabsIcons);
  };

  // ————————————————————————————————————————————————————————————
  // Apply Ready Theme
  // ————————————————————————————————————————————————————————————
  const applyReadyTheme = (themeColors) => {
    setChagesSaved(false);

    // Apply toolbar background side-effect if needed
    if (themeColors.toolbarBackground) {
      globalThis.SetToolbarBackground?.(themeColors.toolbarBackground);
    }

    let filterMode 
      if(themeColors['iconColor'] ){
        filterMode = getColorFilterCached(themeColors['iconColor'])
      }
      os.log("computed filter for icon color filterMode",filterMode)
    // Update local map
    setColorsMap((prev) => ({
      ...prev,
      [activeSpace]:filterMode? {...themeColors,"filter-mode":filterMode}:themeColors,
    }));

    // Update sidebar theme state (immediate apply)
    setThemeColors((prev) => ({ ...prev, [activeSpace]: themeColors }));

    // Persist to the space
    updateSpace(activeSpace, { themeColors });
  };

  // When switching spaces without saving, restore the last committed theme for that space
  useEffect(() => {
    if (!changesSaved) {
      setThemeColors((prev) => ({
        ...prev,
        [activeSpace]: globalThis.CurrentColors,
      }));
    }
  }, [activeSpace]);
    useEffect(() => {
      if(!masks.firstTimeLoad){
        applyReadyTheme(defaultTheme);
        masks.firstTimeLoad = true;
        
      }

    }, []);

    const [textConfig, setTextConfig] = useState({
        heading: { ...defaultTextConfig.heading },
        chapter: { ...defaultTextConfig.chapter },
        verse: { ...defaultTextConfig.verse },
        bookchapter: { ...defaultTextConfig.bookchapter },
    });


  const handleThemeSelect = (index) => {
    setSelectedTheme(index);
    applyReadyTheme(READY_THEMES[index].colors);
    setChagesSaved(true);
          globalThis.CurrentColors = themeColors?.[activeSpace] || colors;
  };

  const applyVerseFont = (fontFamily) => {
  const updateObj = buildTextConfigUpdate(
    "verse",
    fontFamily,
    FONT_SIZES[selectedFontSize].value,
    textConfig
  );

  updateSpace(activeSpace, updateObj);
};
const applyVerseFontSize = (fontSize) => {
  const updateObj = buildTextConfigUpdate(
    "verse",
    FONT_OPTIONS[selectedFont].value,
    fontSize,
    textConfig
  );

  updateSpace(activeSpace, updateObj);
};

const LINE_HEIGHTS = [-1, 0, 1];

const [lineHeightIndex, setLineHeightIndex] = useState(1);

const handleDecreaseFontSize = () => {
  if (selectedFontSize > 0) {
    const newIndex = selectedFontSize - 1;
    setSelectedFontSize(newIndex);
    applyVerseFontSize(FONT_SIZES[newIndex].value);
  }
};

const handleIncreaseFontSize = () => {
  if (selectedFontSize < FONT_SIZES.length - 1) {
    const newIndex = selectedFontSize + 1;
    setSelectedFontSize(newIndex);
    applyVerseFontSize(FONT_SIZES[newIndex].value);
  }
};

const applyVerseLineHeight = (lineHeight) => {
  const updateObj = buildTextConfigUpdate(
    "verse",
    FONT_OPTIONS[selectedFont].value,       // keep current font
    FONT_SIZES[selectedFontSize].value,     // keep current font size
    {
      ...textConfig,
      verse: {
        ...textConfig.verse,
        lineHeight,                         // override line-height
      },
    }
  );

  updateSpace(activeSpace, updateObj);
};




const handleCycleLineHeight = () => {
  const nextIndex = (lineHeightIndex + 1) % LINE_HEIGHTS.length;
  setLineHeightIndex(nextIndex);
  applyVerseLineHeight(LINE_HEIGHTS[nextIndex]);
};

  const containerStyle = {
    width: '280px',
    height:'100%',
    // minHeight: '100vh',
    // backgroundColor: '#F0F1F1',
    fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif',
    padding: '20px',
    overflow:'scroll',
    position: 'relative'
  };

  const sectionTitleStyle = {
    fontSize: '16px',
    color: 'var(--text2)',
    fontWeight: '500',
    marginBottom: '12px'

  };

  const cardContainerStyle = {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  };

  const cardStyle = (isSelected) => ({
    width: '98px',
    height: '89px',
    backgroundColor: 'white',
    border: isSelected ? '2px solid #4459F3' : '1px solid #E1E3EA',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    transition: 'border 0.2s ease'
  });

  const cardSidebarStyle = (color) => ({
    width: '27px',
    height: '100%',
    backgroundColor: color,
    opacity: 0.1,
    position: 'absolute',
    left: 0,
    top: 0
  });

  const cardBadgeStyle = (color) => ({
    width: '21.75px',
    height: '3.75px',
    backgroundColor: color,
    opacity: 0.6,
    borderRadius: '1px',
    margin: '8px 0 0 2px',
    border: `0.25px solid ${color}`
  });

  const cardIconStyle = (color) => ({
    width: '3px',
    height: '3px',
    backgroundColor: color,
    borderRadius: '0.5px',
    position: 'absolute',
    left: '21px',
    top: '3px'
  });

  const cardLabelStyle = {
    width: '8px',
    height: '1px',
    backgroundColor: '#333333',
    borderRadius: '0.5px',
    margin: '4px 0 0 3px'
  };

  const cardLineStyle = {
    height: '1px',
    backgroundColor: 'black',
    opacity: 0.6,
    marginLeft: '31px'
  };

  const dropdownStyle = {
    width: '100%',
    backgroundColor: 'white',
    border: '1px solid #E1E3EA',
    borderRadius: '4px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    position: 'relative'
  };

  const dropdownTextStyle = {
    fontSize: '13px',
    color: 'black'
  };

  const dropdownSubtextStyle = {
    fontSize: '10px',
    color: 'rgba(0,0,0,0.5)',
    marginTop: '2px'
  };

  const dropdownMenuStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #E1E3EA',
    borderRadius: '4px',
    marginTop: '4px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 10,
    maxHeight: '200px',
    overflowY: 'auto'
  };

  const menuItemStyle = (isSelected) => ({
    padding: '12px 16px',
    cursor: 'pointer',
    backgroundColor: isSelected ? '#F5F5F5' : 'white',
    borderBottom: '1px solid #F0F0F0',
    fontSize: '13px',
    transition: 'background-color 0.2s'
  });

  const toggleRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  };

  const toggleLabelStyle = {
    fontSize: '11px',
    color: 'var(--text2)'
  };

  const toggleStyle = (isOn) => ({
    width: '32px',
    height: '16px',
    backgroundColor: isOn ? '#4459F3' : '#CCCCCD',
    borderRadius: '8px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  });

  const toggleCircleStyle = (isOn) => ({
    width: '12px',
    height: '12px',
    backgroundColor: 'white',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: isOn ? '18px' : '2px',
    transition: 'left 0.3s ease'
  });

  const separatorStyle = {
    height: '1px',
    backgroundColor: '#CCCCCD',
    margin: '30px 0'
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4459F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '20px',
    transition: 'background-color 0.2s'
  };

  return (
    <div className="themeSettings-container" style={containerStyle}>
        <div className="routerOptions">
        <div
          onClick={() => {
            // if (!changesSaved) {
            //   setThemeColors((prev) => ({
            //     ...prev,
            //     [activeSpace]: globalThis.CurrentColors,
            //   }));
            // }
            setSideBarMode("settings");
          }}
          style={{ cursor: "pointer" }}
          className="blackText"
        >
          <MenuIcon name="arrow_back" />
        </div>
        <div className="softText">Page settings</div>
        <div className="softText">
          <MenuIcon name="chevron_right" />
        </div>
        <div className="softText">Theme</div>
      </div>
      <div style={{ marginTop: '20px' }}>
        <div className="routerTitle blackText">
        <div className="blackText">
          <ThemeIcon />
        </div>
        <div>{currentSpace.name} Theme</div>
      </div>
        <div style={{ display: 'flex', gap: '7px', marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '43px',
            backgroundColor: 'white',
            border: '1px solid #E1E3EA',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={handleDecreaseFontSize}
          >
            <svg style={{filter:'none'}} width="12" height="12" viewBox="0 0 12 12" fill="none">
              <text x="6" y="9" fontSize="8" textAnchor="middle" fill="black">A</text>
            </svg>
          </div>
          <div style={{
            width: '80px',
            height: '43px',
            backgroundColor: 'white',
            border: '1px solid #E1E3EA',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer'
          }}
            onClick={handleIncreaseFontSize}

          >
            <svg style={{filter:'none'}} width="20" height="20" viewBox="0 0 20 20" fill="none">
              <text x="10" y="14" fontSize="14" textAnchor="middle" fill="black">A</text>
            </svg>
          </div>
  <div
  style={{
    width: '80px',
    height: '43px',
    backgroundColor: 'white',
    border: '1px solid #E1E3EA',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    position: 'relative'
  }}
  onClick={handleCycleLineHeight}
>
  <svg style={{filter:'none'}} width="18" height="18" viewBox="0 0 18 18" fill="none">
    {(() => {
      const level = LINE_HEIGHTS[lineHeightIndex]; // -1, 0, +1

      // base gap is 4.5 inside the 18px box
      const baseGap = 4.5;

      // each level adjusts the gap slightly
      const gap = baseGap + level * 2;

      const startY = 3; 

      return (
        <>
          <rect x="3" y={startY}         width="12" height="2" rx="1" fill="black" />
          <rect x="3" y={startY + gap}   width="12" height="2" rx="1" fill="black" />
          <rect x="3" y={startY + 2*gap} width="12" height="2" rx="1" fill="black" />
        </>
      );
    })()}
  </svg>
</div>


        </div>

        <div style={dropdownStyle} onClick={() => setShowFontDropdown(!showFontDropdown)}>
          <div>
            <div style={dropdownTextStyle}>{FONT_OPTIONS[selectedFont].name}</div>
            <div style={dropdownSubtextStyle}>Font</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 11L3 6L3.7 5.3L8 9.6L12.3 5.3L13 6L8 11Z" fill="black"/>
          </svg>
          {showFontDropdown && (
            <div style={dropdownMenuStyle} onClick={(e) => e.stopPropagation()}>
              {FONT_OPTIONS.map((font, index) => (
                <div
                  key={index}
                  style={menuItemStyle(selectedFont === index)}
                  onClick={() => {
  setSelectedFont(index);
  applyVerseFont(FONT_OPTIONS[index].value);
  setShowFontDropdown(false);
}}

                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F5F5'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = selectedFont === index ? '#F5F5F5' : 'white'}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={toggleRowStyle}>
  <div style={toggleLabelStyle}>Show chapter headings</div>

  <div
    style={toggleStyle(showHeading[activeSpace])}
    onClick={() =>
      setShowHeading(prev => ({
        ...prev,
        [activeSpace]: !prev[activeSpace]
      }))
    }
  >
    <div style={toggleCircleStyle(showHeading[activeSpace])}></div>
  </div>
</div>

<div style={toggleRowStyle}>
  <div style={toggleLabelStyle}>Show verses numbers</div>

  <div
    style={toggleStyle(showVerses[activeSpace])}
    onClick={() =>
      setShowVerses(prev => ({
        ...prev,
        [activeSpace]: !prev[activeSpace]
      }))
    }
  >
    <div style={toggleCircleStyle(showVerses[activeSpace])}></div>
  </div>
</div>

      <div style={separatorStyle}></div>

      <div style={sectionTitleStyle}>Themes</div>
      
      <div style={cardContainerStyle}>
        {READY_THEMES.map((theme, index) => index !==1 ?(
          <div 
            key={index} 
            style={cardStyle(selectedTheme === index)}
            onClick={() => handleThemeSelect(index)}
          >
            <div style={cardSidebarStyle(theme.colors.menuBackground)}>
              <div style={cardBadgeStyle(theme.colors.menuBackground)}></div>
              <div style={cardLabelStyle}></div>
            </div>
            <div style={cardIconStyle(theme.colors.menuBackground)}></div>
            <div style={{ marginTop: '14px' }}>
              <div style={{ ...cardLineStyle, width: '53px' }}></div>
              <div style={{ ...cardLineStyle, width: '42px', marginTop: '7px' }}></div>
              <div style={{ ...cardLineStyle, width: '53px', marginTop: '7px' }}></div>
              <div style={{ ...cardLineStyle, width: '35px', marginTop: '7px' }}></div>
            </div>
            <div style={{
              position: 'absolute',
              bottom: '9px',
              right: '13px',
              width: '22px',
              height: '5px',
              backgroundColor: theme.colors.menuBackground,
              opacity: 0.1,
              borderRadius: '1px'
            }}></div>
            
            {selectedTheme === index && (
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '20px',
                height: '20px',
                backgroundColor: '#4459F3',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        ):   <div 
            key={index} 
             style={{
        ...cardStyle(selectedTheme === index),
        backgroundColor: '#404040',
      }}
            onClick={() => handleThemeSelect(index)}
          >
            <div style={cardSidebarStyle('rgb(255 255 255)')}>
              <div style={cardBadgeStyle('black')}></div>
              <div style={cardLabelStyle}></div>
            </div>
            <div style={cardIconStyle('black')}></div>
            <div style={{ marginTop: '14px' }}>
              <div style={{ ...cardLineStyle,backgroundColor:'white', width: '53px' }}></div>
              <div style={{ ...cardLineStyle,backgroundColor:'white', width: '42px', marginTop: '7px' }}></div>
              <div style={{ ...cardLineStyle,backgroundColor:'white', width: '53px', marginTop: '7px' }}></div>
              <div style={{ ...cardLineStyle,backgroundColor:'white', width: '35px', marginTop: '7px' }}></div>
            </div>
            <div style={{
              position: 'absolute',
              bottom: '9px',
              right: '13px',
              width: '22px',
              height: '5px',
              backgroundColor: "white",
              opacity: 0.1,
              borderRadius: '1px'
            }}></div>
            
            {selectedTheme === index && (
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '20px',
                height: '20px',
                backgroundColor: '#4459F3',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>)}
      </div>
        <button
        style={buttonStyle}
        onClick={() => setSideBarMode("advancedThemeSettings")}
      >
        Advanced settings
      </button>
      <div style={separatorStyle}></div>
    </div>
  );
};
export { ThemeSettings,SettingsUI };
