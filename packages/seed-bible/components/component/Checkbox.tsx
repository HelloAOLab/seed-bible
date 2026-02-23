const Checkbox = (props: any) => {
  const { checked, small, onClick, style, disabled } = props;
  return (
    <>
      <style>{thisBot.tags["Checkbox.css"]}</style>
      <div
        style={style}
        className={`checkbox ${small && "small"}`}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          onClick(!checked);
        }}
      >
        {checked ? (
          <span
            style={{ backgroundColor: "var(--primaryColor)", color: "white" }}
            class="material-symbols-outlined unfollow checked color-inherit"
          >
            check_box
          </span>
        ) : (
          <span
            style={{ fontSize: "20px" }}
            class="material-symbols-outlined unfollow unchecked color-inherit"
          >
            check_box_outline_blank
          </span>
        )}
      </div>
    </>
  );
};

return Checkbox;
