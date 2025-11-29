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
  text1: "#606060",
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
    name: "Ocean Blue",
    colors: {
      menuBackground: "#E6F3FF",
      primaryButton: "#B3D9FF",
      primaryButtonColor: "#0066CC",
      secondaryButton: "#0080FF",
      secondaryButtonColor: "#FFFFFF",
      buttonBorder: "#0066CC",
      tabSelection: "#0080FF",
      spaceSelection: "#0080FF",
      toolbarBackground: "#F0F8FF",
      text1: "#333333",
      text2: "#000000",
      showTabIcons: true,
    },
  },
  {
    name: "Forest Green",
    colors: {
      menuBackground: "#E8F5E8",
      primaryButton: "#C8E6C9",
      primaryButtonColor: "#2E7D32",
      secondaryButton: "#4CAF50",
      secondaryButtonColor: "#FFFFFF",
      buttonBorder: "#388E3C",
      tabSelection: "#4CAF50",
      spaceSelection: "#4CAF50",
      toolbarBackground: "#F1F8E9",
      text1: "#333333",
      text2: "#000000",
      showTabIcons: true,
    },
  },
  {
    name: "Sunset Orange",
    colors: {
      menuBackground: "#FFF3E0",
      primaryButton: "#FFCC80",
      primaryButtonColor: "#E65100",
      secondaryButton: "#FF9800",
      secondaryButtonColor: "#FFFFFF",
      buttonBorder: "#F57C00",
      tabSelection: "#FF9800",
      spaceSelection: "#FF9800",
      toolbarBackground: "#FFF8F0",
      text1: "#333333",
      text2: "#000000",
      showTabIcons: true,
    },
  },
  {
    name: "Purple Dreams",
    colors: {
      menuBackground: "#F3E5F5",
      primaryButton: "#E1BEE7",
      primaryButtonColor: "#6A1B9A",
      secondaryButton: "#9C27B0",
      secondaryButtonColor: "#FFFFFF",
      buttonBorder: "#7B1FA2",
      tabSelection: "#9C27B0",
      spaceSelection: "#9C27B0",
      toolbarBackground: "#FCE4EC",
      text1: "#333333",
      text2: "#000000",
      showTabIcons: true,
    },
  },
  {
    name: "Midnight",
    colors: {
      menuBackground: "#1A1A1A",
      primaryButton: "#333333",
      primaryButtonColor: "#FFFFFF",
      secondaryButton: "#6B46C1",
      secondaryButtonColor: "#FFFFFF",
      buttonBorder: "#6B46C1",
      tabSelection: "#6B46C1",
      spaceSelection: "#6B46C1",
      toolbarBackground: "#0F0F0F",
      text1: "#FFFFFF",
      text2: "#FFFFFF",
      showTabIcons: true,
    },
  },
  {
    name: "Minimal",
    colors: {
      menuBackground: "#FAFAFA",
      primaryButton: "#F5F5F5",
      primaryButtonColor: "#666666",
      secondaryButton: "#000000",
      secondaryButtonColor: "#FFFFFF",
      buttonBorder: "#CCCCCC",
      tabSelection: "#000000",
      spaceSelection: "#000000",
      toolbarBackground: "#FFFFFF",
      text1: "#666666",
      text2: "#000000",
      showTabIcons: true,
    },
  },
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

    // Update local map
    setColorsMap((prev) => ({
      ...prev,
      [activeSpace]: themeColors,
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

    applyReadyTheme(defaultTheme);

}, []);

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
      <div style={{ height: 15 }} />
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

export { ThemeSettings };
