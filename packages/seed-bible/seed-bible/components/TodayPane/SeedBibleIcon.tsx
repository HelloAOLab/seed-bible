import { useAppConfig } from "../../app/appConfig";

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
