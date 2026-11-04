import { useI18n } from "../i18n";
import type { SandboxDiscoverFact } from "../extensions/protocol";

/** `url` if it's an `https:` link, normalized; otherwise undefined. */
export function httpsUrl(url: string): URL | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** `95` → `"1:35"`, `3725` → `"1:02:05"`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Aliases and facts under a `metadata` card's description. */
export function MetadataDetails(props: {
  aliases?: readonly string[];
  facts?: readonly SandboxDiscoverFact[];
}) {
  const { t } = useI18n();
  const aliases = props.aliases ?? [];
  const facts = props.facts ?? [];
  if (aliases.length === 0 && facts.length === 0) {
    return null;
  }

  return (
    <dl className="sb-discover-facts">
      {aliases.length > 0 ? (
        <div className="sb-discover-fact">
          <dt>
            {t("discover-also-known-as", { defaultValue: "Also known as" })}
          </dt>
          <dd>{aliases.join(", ")}</dd>
        </div>
      ) : null}
      {facts.map((fact, index) => (
        <div key={index} className="sb-discover-fact">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Where a `video` or `website` card leads, shown before the reader follows
 * it: the site's host name is the part an extension can't disguise.
 */
export function LinkDetails(props: {
  url: URL;
  author?: string;
  durationSeconds?: number;
}) {
  const parts = [
    props.author,
    props.url.host,
    props.durationSeconds != null
      ? formatDuration(props.durationSeconds)
      : undefined,
  ].filter((part): part is string => !!part);

  return <span className="sb-discover-link-details">{parts.join(" · ")}</span>;
}
