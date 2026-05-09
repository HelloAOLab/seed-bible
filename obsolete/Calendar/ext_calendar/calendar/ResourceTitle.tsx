const { useState } = os.appHooks;

const ResourceTitle = ({ scheduleDescription }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(scheduleDescription);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      setIsEditing(false);
    }
  };

  return (
    <div style={{ textAlign: "center", backgroundColor: "white" }}>
      <div
        style={{
          fontFamily: "Satoshi",
          textAlign: "center",
          gap: "18px",
          position: "absolute",
          top: "60px",

          fontSize: "8px",
        }}
      >
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur} // now closes when clicking outside
            onKeyDown={handleKeyDown}
            autoFocus // focus immediately on edit
            style={{
              fontSize: "18px",
              padding: "1px 2px",
              fontFamily: "Satoshi",
              textAlign: "center",
            }}
          />
        ) : (
          <span
            style={{ margin: 0, cursor: "pointer", fontSize: "12px" }}
            onClick={handleClick}
            title="Click to edit"
          >
            {scheduleDescription}
          </span>
        )}
      </div>
    </div>
  );
};

return ResourceTitle;
