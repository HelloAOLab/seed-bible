const CircleCounter = ({ data }: any) => {
  if (!data) return;
  const entries = Object.entries(data);
  const visibleCount = 2;
  const remaining = entries.length - visibleCount;

  const colors = [
    "bg-blue-500",
    "bg-red-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-yellow-500",
    "bg-pink-500",
  ];

  const circleStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "600",
    fontSize: "16px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    border: "2px solid white",
  };

  const colorMap: Record<number, string> = {
    0: "#3b82f6",
    1: "#ef4444",
    2: "#10b981",
    3: "#a855f7",
    4: "#eab308",
    5: "#ec4899",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "16px" }}>
      {entries.slice(0, visibleCount).map(([id, value], index) => (
        <div
          key={id}
          style={{
            ...circleStyle,
            backgroundColor: colorMap[index % 6],
            marginLeft: index > 0 ? "-12px" : "0",
            zIndex: visibleCount - index,
          }}
        >
          {value}
        </div>
      ))}

      {remaining > 0 && (
        <div
          style={{
            ...circleStyle,
            backgroundColor: "#9ca3af",
            fontSize: "12px",
            marginLeft: "-12px",
            zIndex: 0,
          }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

export { CircleCounter };
