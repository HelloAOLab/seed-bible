import { useAppConfig } from "@packages/seed-bible/seed-bible/app/appConfig";

export function SeedBibleIcon({ style = {} }: { style?: React.CSSProperties }) {
  const { branding } = useAppConfig();

  if (branding?.icon) {
    return <img src={branding.icon} alt={branding.appName} />;
  }

  return <div className="seed-bible-icon" style={style} />;
}
