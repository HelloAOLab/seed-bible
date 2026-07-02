import { featureButtonCss } from "ext_discover.css.featureButtonCss";
import { LoaderSecondary } from "ext_discover.features.components.LoaderSecondary";

const G = globalThis as Record<string, any>;

export function Button({
  children,
  loading,
  onClick,
  isOutline = false,
  isDisabled,
  secondaryAlt,
  small,
  exClass = "",
  secondary = false,
  color = "",
  backgroundColor = "",
  style = {},
  varient = "",
}: Record<string, any>) {
  return (
    <>
      <style>{featureButtonCss}</style>
      <button
        disabled={isDisabled}
        onClick={(e: Event) => {
          if (!loading && isDisabled) return;
          G.shout?.("playSound", { soundName: "DialogClick" });
          onClick?.(e);
        }}
        className={`custom-button ${exClass} ${small ? "small" : ""} ${secondaryAlt ? "secondaryAlt secondaryAltAlt" : ""}  ${secondary ? "secondaryAlt" : ""} ${varient} ${isOutline ? "outline" : ""}`}
        style={{
          color,
          backgroundColor,
          ...style,
        }}
      >
        {children}
        {loading ? <LoaderSecondary secondary={secondary} /> : null}
      </button>
    </>
  );
}
