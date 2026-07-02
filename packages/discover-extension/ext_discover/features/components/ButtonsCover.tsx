import { featureButtonCoverCss } from "ext_discover.css.featureButtonCoverCss";

export function ButtonsCover(props: {
  children?: any;
  secondary?: boolean;
  style?: Record<string, any>;
}) {
  const { children, secondary, style = {} } = props;
  return (
    <>
      <style>{featureButtonCoverCss}</style>
      <div
        style={style}
        className={`button-cover ${secondary ? "secondary" : ""}`}
      >
        {children}
      </div>
    </>
  );
}
