function handleResourceLabel({
  arg,
  setResourceStartDate,
  setResourceGroupName,
  setGroupMenu,
}) {
  setResourceStartDate(arg.view.currentStart);
  setResourceGroupName(arg.groupValue);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span>{arg.groupValue}</span>
      <button
        ref={(el) => {
          if (el) el.dataset.groupValue = arg.groupValue;
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
        }}
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setGroupMenu({
            groupValue: arg.groupValue,
            position: {
              top: rect.top + window.scrollY + 20,
              left: rect.left + window.scrollX,
            },
          });
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="gray">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
    </div>
  );
}
return handleResourceLabel;
