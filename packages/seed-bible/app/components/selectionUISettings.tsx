const { useState, useEffect } = os.appHooks;
import { useSideBarContext } from "app.hooks.sideBar";
import { useTabsContext } from "app.hooks.tabs";
import { MenuIcon, SelectionUIIcon } from "app.components.icons";
import { useGlobalsContext } from "app.hooks.globalsContext";

const SelectionUISettings = () => {
  const globals = useGlobalsContext();
  const { setSideBarMode, t } = useSideBarContext();
  const { updateSpace, activeSpace, spaces } = useTabsContext();

  // Get current space settings
  const currentSpace = spaces.find((s) => s.id === activeSpace);
  const savedSettings = currentSpace?.selectionUIBehavior || {};

  // Initialize state from saved settings
  const [showSelectedItems, setShowSelectedItems] = useState(
    savedSettings.showSelectedItems !== undefined
      ? savedSettings.showSelectedItems
      : true
  );
  const [showHighlightColors, setShowHighlightColors] = useState(
    savedSettings.showHighlightColors !== undefined
      ? savedSettings.showHighlightColors
      : true
  );
  const [showIconText, setShowIconText] = useState(
    savedSettings.showIconText !== undefined ? savedSettings.showIconText : true
  );

  // Save settings when they change
  useEffect(() => {
    const settings = {
      showSelectedItems,
      showHighlightColors,
      showIconText,
    };
    updateSpace(activeSpace, { selectionUIBehavior: settings });

    // Also update globalThis for immediate access in verseToolbar
    if (!globals.selectionUIBehavior) {
      globals.selectionUIBehavior = {};
    }
    globals.selectionUIBehavior[activeSpace] = settings;
  }, [showSelectedItems, showHighlightColors, showIconText, activeSpace]);

  // Styles
  const containerStyle = {
    padding: "16px",
    fontFamily: "Open Sans, sans-serif",
    // color: "var(--text1)",
    // backgroundColor: "var(--pageBackground)",
    height: "100%",
    overflowY: "auto",
    width: "280px",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
    cursor: "pointer",
    color: "var(--text2)",
    fontSize: "13px",
  };

  const breadcrumbStyle = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--text2)",
    fontSize: "12px",
    marginBottom: "16px",
  };

  const titleContainerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  };

  const titleStyle = {
    fontSize: "18px",
    fontWeight: "600",
    color: "var(--text1)",
  };

  const descriptionStyle = {
    fontSize: "13px",
    color: "var(--text2)",
    marginBottom: "24px",
  };

  const settingRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  };

  const settingLabelStyle = {
    fontSize: "14px",
    color: "var(--text1)",
  };

  const toggleStyle = (isOn) => ({
    width: "44px",
    height: "24px",
    backgroundColor: isOn ? "var(--spaceSelection)" : "#CCCCCD",
    borderRadius: "12px",
    position: "relative",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  });

  const toggleCircleStyle = (isOn) => ({
    width: "20px",
    height: "20px",
    backgroundColor: "white",
    borderRadius: "50%",
    position: "absolute",
    top: "2px",
    left: isOn ? "22px" : "2px",
    transition: "left 0.3s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  });

  const sectionTitleStyle = {
    fontSize: "14px",
    fontWeight: "500",
    color: "var(--text1)",
    marginTop: "24px",
    marginBottom: "12px",
  };

  return (
    <div style={containerStyle}>
      <div className="routerOptions">
        <div
          onClick={() => setSideBarMode("settings")}
          style={{ cursor: "pointer" }}
          className="blackText"
        >
          <MenuIcon name="arrow_back" />
        </div>
        <div className="softText">Space settings</div>
        <div className="softText">
          <MenuIcon name="chevron_right" />
        </div>
        <div className="softText">Selection UI</div>
      </div>

      {/* Title with icon */}
      <div style={titleContainerStyle}>
        <SelectionUIIcon />
        <span style={{ color: "var(--text1)" }}>{t("selectionUI")}</span>
      </div>

      {/* Description */}
      <div style={descriptionStyle}>{t("selectionUIDescription")}</div>

      {/* Toggle: Show selected items */}
      <div style={settingRowStyle}>
        <span style={settingLabelStyle}>{t("showSelectedItems")}</span>
        <div
          style={toggleStyle(showSelectedItems)}
          onClick={() => setShowSelectedItems(!showSelectedItems)}
        >
          <div style={toggleCircleStyle(showSelectedItems)}></div>
        </div>
      </div>

      {/* Toggle: Show highlight colors */}
      <div style={settingRowStyle}>
        <span style={settingLabelStyle}>{t("showHighlightColors")}</span>
        <div
          style={toggleStyle(showHighlightColors)}
          onClick={() => setShowHighlightColors(!showHighlightColors)}
        >
          <div style={toggleCircleStyle(showHighlightColors)}></div>
        </div>
      </div>

      {/* Toggle: Show Icon text */}
      <div style={settingRowStyle}>
        <span style={settingLabelStyle}>{t("showIconText")}</span>
        <div
          style={toggleStyle(showIconText)}
          onClick={() => setShowIconText(!showIconText)}
        >
          <div style={toggleCircleStyle(showIconText)}></div>
        </div>
      </div>
    </div>
  );
};

export { SelectionUISettings };
