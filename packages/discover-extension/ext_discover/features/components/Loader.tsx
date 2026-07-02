import { featureLoaderCss } from "ext_discover.css.featureLoaderCss";

export function Loader({
  width = "42px",
  height = "42px",
}: {
  width?: string;
  height?: string;
}) {
  return (
    <>
      <style>{featureLoaderCss}</style>
      <span className="loader" style={{ width, height }} />
    </>
  );
}
