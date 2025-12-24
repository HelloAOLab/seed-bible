const { useSideBarContext } = await import("app.hooks.sideBar");

const { useState, useEffect, useRef } = os.appHooks;

const RepeatModal = ({
  initialDate,
  onClose,
  onSave,
  setSelectedDays,
  selectedDays,
}) => {
  const { t } = useSideBarContext();

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    onSave?.(selectedDays);
    onClose?.();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          fontFamily: "Roboto, sans-serif",
          backgroundColor: "#ededed",
          border: "1px solid lightgray",
          borderRadius: "20px",
          padding: "16px",
          width: "340px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <h1 style={{ margin: 0 }}>{t("customRecurrence")}</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <h4 style={{ marginBottom: "4px" }}>{t("repeatOn")}</h4>
          <div style={{ display: "flex", gap: "5px" }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
              <label
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <input
                  type="checkbox"
                  value={i + 1}
                  checked={selectedDays.includes(i + 1)}
                  onChange={(e) => toggleDay(i + 1)}
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "12px", textAlign: "right" }}>
          <button onClick={handleSave} style={{ marginRight: "8px" }}>
            {t("save")}
          </button>
          <button onClick={onClose}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  );
};

return RepeatModal;
