import { featureFloatingBannerCss } from "ext_discover.css.featureFloatingBannerCss";

export function FloatingBanner(props: {
  children?: any;
  doNotFloat?: boolean;
  bgColor?: string;
  color?: string;
  zIndex?: number;
}) {
  const {
    children,
    doNotFloat = false,
    bgColor = "white",
    color = "black",
    zIndex = 99000,
  } = props;
  return (
    <>
      <style>{featureFloatingBannerCss}</style>
      <div
        className={`floating-banner ${doNotFloat ? "not-float" : ""}`}
        style={{ backgroundColor: bgColor, color, zIndex }}
      >
        {children}
      </div>
    </>
  );
}
