const { useState, useMemo } = os.appHooks;
import { useBibleContext } from "app.hooks.bibleVariables";
function PanelSettingsDialog({ onClose }) {
  const { panelMode, screens, setScreens } = useBibleContext();
  const openPanelCount = screens.value || 1;
  const isCurrentlyRow = screens.row || false;

  // Determine initial layout index based on current row state
  const initialLayoutIndex = useMemo(() => {
    // For 3 or 4 panels, if currently in row mode, select the row layout (index 1)
    if ((openPanelCount === 3 || openPanelCount === 4) && isCurrentlyRow) {
      return 1;
    }
    return 0;
  }, [openPanelCount, isCurrentlyRow]);

  const [selectedLayout, setSelectedLayout] = useState(initialLayoutIndex);
  const [panelOverlap, setPanelOverlap] = useState(screens.overlap !== false);

  const nextPanelNumber = openPanelCount;

  const generateLayouts = (currentPanels, nextPanel) => {
    const layouts = [];

    if (nextPanel === 1) {
      layouts.push({
        name: "Layout 1",
        grid: "1fr",
        rows: "1fr",
        isRow: false,
        panels: [{ id: 1, isExisting: true }],
      });
    }

    if (nextPanel === 2) {
      layouts.push({
        name: "Layout 1",
        grid: "1fr 1fr",
        rows: "1fr",
        isRow: false,
        panels: [
          { id: 1, isExisting: true },
          { id: 2, isNew: true },
        ],
      });
    }

    if (nextPanel === 3) {
      layouts.push({
        name: "3 Panels",
        grid: "2fr 1fr",
        rows: "1fr 1fr",
        isRow: false,
        panels: [
          { id: 1, style: { gridRow: "1 / 3" }, isExisting: true },
          { id: 2, style: {}, isExisting: true },
          { id: 3, style: {}, isNew: true },
        ],
      });

      layouts.push({
        name: "3 in Row",
        grid: "1fr 1fr 1fr",
        rows: "1fr",
        isRow: true,
        panels: [
          { id: 1, isExisting: true },
          { id: 2, isExisting: true },
          { id: 3, isNew: true },
        ],
      });
    }

    if (nextPanel === 4) {
      layouts.push({
        name: "4 Panels",
        grid: "1fr 1fr",
        rows: "1fr 1fr",
        isRow: false,
        panels: [
          { id: 1, isExisting: true },
          { id: 2, isExisting: true },
          { id: 3, isExisting: true },
          { id: 4, isNew: true },
        ],
      });

      layouts.push({
        name: "4 in Row",
        grid: "1fr 1fr 1fr 1fr",
        rows: "1fr",
        isRow: true,
        panels: [
          { id: 1, isExisting: true },
          { id: 2, isExisting: true },
          { id: 3, isExisting: true },
          { id: 4, isNew: true },
        ],
      });
    }

    return layouts;
  };

  const layouts = generateLayouts(openPanelCount, nextPanelNumber);
  const defaultNewPanel = layouts.flatMap((l) => l.panels).find((p) => p.isNew);
  const [selectedPanel, setSelectedPanel] = useState(
    defaultNewPanel?.id || null
  );

  const handleConfirm = () => {
    const selectedLayoutData = layouts[selectedLayout];
    if (!selectedLayoutData) return;

    const panelCount = nextPanelNumber;
    const screenConfig: any = { value: panelCount, overlap: panelOverlap };

    if (selectedLayoutData.isRow) {
      screenConfig.row = true;
    }

    globalThis.setCustomScreens(screenConfig);
    setScreens(screenConfig);

    onClose();
  };

  const renderLayout = (layout, index) => {
    return (
      <div
        key={index}
        onClick={() => setSelectedLayout(index)}
        style={{
          cursor: "pointer",
          padding: "16px",
          border:
            selectedLayout === index
              ? "2px solid var(--selectedSpaceColor)"
              : "2px solid #e5e7eb",
          borderRadius: "8px",
          backgroundColor: "white",
          transition: "border-color 0.2s",
          minWidth: "140px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "12px",
            fontSize: "14px",
            fontWeight: "500",
            color: "var(--descriptionTextColor)",
          }}
        >
          {layout.name}
        </div>
        <div
          style={{
            width: "150px",
            height: "80px",
            display: "grid",
            gridTemplateColumns: layout.grid,
            gridTemplateRows: layout.rows,
            gap: "4px",
          }}
        >
          {layout.panels.map((panel) => (
            <div
              key={panel.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPanel(panel.id);
              }}
              style={{
                backgroundColor:
                  selectedPanel === panel.id
                    ? "var(--selectedSpaceColor)"
                    : "color-mix(in srgb,var(--selectedSpaceColor) 50%,transparent) ",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: selectedPanel === panel.id ? "white" : "var(--text1)",
                fontWeight: selectedPanel === panel.id ? "500" : "normal",
                cursor: "pointer",
                ...panel.style,
              }}
            >
              {panel.id}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          zIndex: 999999,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "var(--pageBackground) !important",
            borderRadius: "12px",
            width: "auto",
            maxWidth: "90vw",
            padding: "24px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "var(--text1) !important",
                margin: 0,
              }}
            >
              Panel settings
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text1)",
              }}
            >
              X
            </button>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: "var(--descriptionTextColor) !important",
              textAlign: "center",
              marginBottom: "32px",
              lineHeight: "1.4",
            }}
          >
            Select the layout you would like to use.
          </p>

          <div
            style={{
              display: "flex",
              gap: "24px",
              marginBottom: "24px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {layouts.map((layout, index) => renderLayout(layout, index))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              marginBottom: "24px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "var(--text1)",
                }}
              >
                Panel overlap
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--descriptionTextColor)",
                  marginTop: "2px",
                }}
              >
                Panel will overlap the content if this setting is on.
              </div>
            </div>
            <div
              onClick={() => setPanelOverlap(!panelOverlap)}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                backgroundColor: panelOverlap
                  ? "var(--selectedSpaceColor)"
                  : "#d1d5db",
                cursor: "pointer",
                position: "relative",
                transition: "background-color 0.2s",
                flexShrink: 0,
                marginLeft: "16px",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "white",
                  position: "absolute",
                  top: "2px",
                  left: panelOverlap ? "22px" : "2px",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "12px 32px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: "12px 32px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "var(--selectedSpaceColor)",
                color: "white",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export { PanelSettingsDialog };
