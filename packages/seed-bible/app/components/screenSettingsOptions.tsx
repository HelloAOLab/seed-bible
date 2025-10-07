const { useState } = os.appHooks;
import { useBibleContext } from "app.hooks.bibleVariables";
function PanelSettingsDialog({ onClose }) {
  const { panelMode, screens } = useBibleContext();
  const openPanelCount = screens.value || 1;
  const [selectedLayout, setSelectedLayout] = useState(0);

  const nextPanelNumber = openPanelCount + 1;

  const generateLayouts = (currentPanels, nextPanel) => {
    const layouts = [];

    if (nextPanel === 2) {
      layouts.push({
        name: "Layout 1",
        grid: "1fr 1fr",
        rows: "1fr",
        panels: [
          { id: 1, isExisting: true },
          { id: 2, isNew: true },
        ],
      });
    }

    if (nextPanel === 3) {
      layouts.push({
        name: "Layout 1",
        grid: "2fr 1fr",
        rows: "1fr 1fr",
        panels: [
          { id: 1, style: { gridRow: "1 / 3" }, isExisting: true },
          { id: 2, style: {}, isExisting: true },
          { id: 3, style: {}, isNew: true },
        ],
      });

      layouts.push({
        name: "Layout 2",
        grid: "1fr 1fr 1fr",
        rows: "1fr",
        panels: [
          { id: 1, isExisting: true },
          { id: 2, isExisting: true },
          { id: 3, isNew: true },
        ],
      });
    }

    if (nextPanel === 4) {
      layouts.push({
        name: "Layout 1",
        grid: "1fr 1fr",
        rows: "1fr 1fr",
        panels: [
          { id: 1, isExisting: true },
          { id: 2, isExisting: true },
          { id: 3, isExisting: true },
          { id: 4, isNew: true },
        ],
      });

      layouts.push({
        name: "Layout 2",
        grid: "1fr 1fr 1fr 1fr",
        rows: "1fr",
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
              ? "2px solid #d97144"
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
            color: "#333",
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
                  selectedPanel === panel.id ? "#d97144" : "#f4c2c2",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: selectedPanel === panel.id ? "white" : "#d97144",
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
            backgroundColor: "white",
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
                color: "#333",
                margin: 0,
              }}
            >
              New panel settings
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
              }}
            >
              X
            </button>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: "#666",
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
              marginBottom: "40px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {layouts.map((layout, index) => renderLayout(layout, index))}
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
              style={{
                padding: "12px 32px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#d97144",
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
