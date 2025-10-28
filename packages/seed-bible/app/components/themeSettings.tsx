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
  { label: "Menu Background", field: "menuBackground" }, // replaces sideMenu in UI
  { label: "Primary button background", field: "primaryButton" },
  { label: "Primary button text", field: "primaryButtonColor" },
  { label: "Secondary button background", field: "secondaryButton" },
  { label: 'Secondary button text', field: 'secondaryButtonColor' },
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

const themeBot = getBot(byTag("system", "app.themeManager"));

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

  // ————————————————————————————————————————————————————————————
  // Persist + broadcast color changes
  // ————————————————————————————————————————————————————————————
  const handleColorChange = (field, e) => {
    const newColor = e.target.value;
    setChagesSaved(false);

    if (field === "toolbarBackground") {
      // preserve your side-effect hook
      globalThis.SetToolbarBackground?.(newColor);
    }

    const updatedColors = {
      ...colors,
      [field]: newColor,
    };

    // keep local map keyed by space
    setColorsMap((prev) => ({
      ...prev,
      [activeSpace]: updatedColors,
    }));

    // update sidebar theme state (immediate apply)
    setThemeColors((prev) => ({ ...prev, [activeSpace]: updatedColors }));

    // persist to the space
    updateSpace(activeSpace, { themeColors: updatedColors });
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
          themeBot.tags.newTheme = globalThis.CurrentColors;
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
