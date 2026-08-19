import { useAppConfig } from "../../app/appConfig";

/**
 * Not core's exported `SeedBibleIcon`: that one draws an inline 555x298 `<svg>`
 * filled with `currentColor`, while this one is a `<div>` the stylesheet paints
 * with a masked background, so swapping would change both the aspect ratio and
 * how the icon takes its colour. See chunk B/E.
 */
export function SeedBibleIcon({ style = {} }: { style?: React.CSSProperties }) {
  const { branding } = useAppConfig();

  if (branding?.icon) {
    return (
      <img
        src={branding.icon}
        alt={branding.appName}
        style={{
          ...style,
          backgroundColor: "transparent",
        }}
      />
    );
  }

  return <div className="seed-bible-icon" style={style} />;
}
