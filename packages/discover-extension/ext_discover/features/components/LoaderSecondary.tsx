import { featureLoaderSecondaryCss } from "ext_discover.css.featureLoaderSecondaryCss";

export function LoaderSecondary(props: { secondary?: boolean }) {
  const { secondary } = props;
  return (
    <>
      <style>{featureLoaderSecondaryCss}</style>
      <div
        style={{
          backgroundColor: secondary ? "grey" : "var(--secondaryColor)",
        }}
        className="loader"
      />
    </>
  );
}
