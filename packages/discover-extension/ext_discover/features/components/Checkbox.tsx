import { featureCheckboxCss } from "ext_discover.css.featureCheckboxCss";

export function Checkbox(props: {
  checked?: boolean;
  small?: boolean;
  onClick?: (checked: boolean) => void;
  style?: Record<string, any>;
  disabled?: boolean;
}) {
  const { checked, small, onClick, style, disabled } = props;
  return (
    <>
      <style>{featureCheckboxCss}</style>
      <div
        style={style}
        className={`checkbox ${small && "small"}`}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          onClick?.(!checked);
        }}
      >
        {checked ? (
          <span
            style={{ backgroundColor: "var(--secondaryColor)", color: "white" }}
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
}
