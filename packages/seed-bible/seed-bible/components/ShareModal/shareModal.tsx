import "./shareModal.css";
import { useEffect, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { AppState } from "../../managers/SeedBibleStateManager";
import {
  buildEmbedIframeHtml,
  buildEmbedUrl,
  type EmbedThemeChoice,
} from "../../managers/EmbedMode";
import {
  DARK_THEME,
  LIGHT_THEME,
  SYSTEM_THEME_ID,
} from "../../managers/ThemeManager";
import {
  getSessionUrl,
  type BibleReadingSession,
} from "../../managers/SessionsManager";

export interface ShareModalProps {
  /** Called when the sheet should close (Cancel or Escape). */
  onClose?: () => void;
  /** Copy a shareable link to the clipboard. */
  onShareLink?: () => void;
  /** Open the device's native share sheet. */
  onShareVia?: () => void;
  app: AppState;
  hideShareLink?: boolean;
  /** The session to share, or null. */
  session: BibleReadingSession | null;
  /**
   * Passage link the Embed view turns into an iframe. Absent on the
   * session-only sheet, which has nothing to embed.
   */
  shareUrl?: URL;
  /** Theme presets offered besides System. */
  themes?: { readonly value: readonly EmbedThemeChoice[] };
  /** Active customization locator (`recordName.id`), if the viewer is in one. */
  customizationLocator?: { readonly value: string | null };
}

function embedThemeLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  theme: EmbedThemeChoice
): string {
  if (theme.id === LIGHT_THEME.id) {
    return t("theme-light", { defaultValue: theme.name });
  }
  if (theme.id === DARK_THEME.id) {
    return t("theme-dark", { defaultValue: theme.name });
  }
  if (theme.id === SYSTEM_THEME_ID) {
    return t("theme-system", { defaultValue: theme.name });
  }
  return theme.name;
}

export const ShareModal = (props: ShareModalProps) => {
  const { t } = useI18n();
  const [view, setView] = useState<"actions" | "embed">("actions");
  const [themeId, setThemeId] = useState(SYSTEM_THEME_ID);

  const sessionActive = props.session !== null;
  // A partner-site embed shares a link to the passage, not a live session.
  const hideSharedSession = props.app.isMinimalEmbed.value;

  const close = () => props.onClose?.();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const canShareVia =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copySessionLink = async (session: BibleReadingSession) => {
    try {
      const url = getSessionUrl(session);
      await navigator.clipboard.writeText(url.href);
      props.app.toast(
        t("link-to-join-shared-session-copied", {
          defaultValue:
            "A link to join the shared session was copied to your clipboard",
        })
      );
    } catch (error) {
      console.error("Failed to copy the shared session link.", error);
    } finally {
      props.onClose?.();
    }
  };

  const themeChoices = (props.themes?.value ?? []).filter(
    (theme) => theme.id !== SYSTEM_THEME_ID
  );
  const customizationLocator = props.customizationLocator?.value ?? null;
  const embedUrl = props.shareUrl
    ? buildEmbedUrl(props.shareUrl, {
        themeId,
        customizationLocator,
      })
    : null;
  const embedTitle =
    props.app.siteName.value.trim() ||
    t("seed-bible", { defaultValue: "Seed Bible" });
  const embedHtml = embedUrl ? buildEmbedIframeHtml(embedUrl, embedTitle) : "";

  const copyEmbedHtml = async () => {
    if (!embedHtml) return;
    try {
      await navigator.clipboard.writeText(embedHtml);
      props.app.toast(t("copied", { defaultValue: "Copied" }));
    } catch (error) {
      console.error("Failed to copy the embed code.", error);
    }
  };

  const actions = [
    {
      key: "link",
      icon: "link",
      title: t("share-link", { defaultValue: "Share a link" }),
      subtitle: t("share-link-subtitle", { defaultValue: "Copy to clipboard" }),
      onClick: () => props.onShareLink?.(),
    },
    props.shareUrl
      ? {
          key: "embed",
          icon: "code",
          title: t("share-embed", { defaultValue: "Embed" }),
          subtitle: t("share-embed-subtitle", {
            defaultValue: "Add this passage to a website",
          }),
          onClick: () => setView("embed"),
        }
      : null,
    canShareVia
      ? {
          key: "via",
          icon: "ios_share",
          title: t("share-via", { defaultValue: "Share via…" }),
          subtitle: t("share-via-subtitle", {
            defaultValue: "Use your device share sheet",
          }),
          onClick: () => props.onShareVia?.(),
        }
      : null,
    sessionActive
      ? {
          key: "session",
          icon: "group",
          title: t("share-current-session", {
            defaultValue: "Share current session",
          }),
          subtitle: t("share-current-session-subtitle", {
            defaultValue: "Copy a link to invite others to read along live",
          }),
          onClick: () => {
            const session = props.session;
            if (!session) return;
            void copySessionLink(session);
          },
        }
      : {
          key: "session",
          icon: "group",
          title: t("start-share-session", {
            defaultValue: "Start and share session",
          }),
          subtitle: t("start-share-session-subtitle", {
            defaultValue: "Invite others to read along live",
          }),
          onClick: async () => {
            try {
              const session = await props.app.createSharedSession();
              await copySessionLink(session);
            } catch (error) {
              console.error("Failed to start and share a session.", error);
              props.onClose?.();
            }
          },
        },
  ].filter(
    (action): action is NonNullable<typeof action> =>
      action !== null &&
      !(props.hideShareLink && action.key === "link") &&
      !(hideSharedSession && action.key === "session")
  );

  if (view === "embed" && embedUrl) {
    return (
      <div className="sb-share sb-share-embed">
        <button
          type="button"
          className="sb-share-embed-back"
          onClick={() => setView("actions")}
        >
          <span className="material-symbols-outlined rtl-mirror">
            arrow_back
          </span>
          {t("back", { defaultValue: "Back" })}
        </button>
        <iframe
          key={embedUrl.href}
          className="sb-share-embed-preview"
          src={embedUrl.href}
          title={t("share-embed-preview", { defaultValue: "Preview" })}
        />
        <label className="sb-share-embed-field">
          <span>{t("share-embed-theme", { defaultValue: "Theme" })}</span>
          <select
            value={themeId}
            onChange={(event) => {
              setThemeId(event.currentTarget.value);
            }}
          >
            <option value={SYSTEM_THEME_ID}>
              {embedThemeLabel(t, { id: SYSTEM_THEME_ID, name: "System" })}
            </option>
            {themeChoices.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {embedThemeLabel(t, theme)}
              </option>
            ))}
          </select>
        </label>
        <div className="sb-share-embed-code">
          <textarea
            readOnly
            rows={4}
            spellcheck={false}
            aria-label={t("share-embed-code", { defaultValue: "Embed code" })}
            value={embedHtml}
          />
          <button
            type="button"
            className="sb-share-embed-copy"
            onClick={() => {
              void copyEmbedHtml();
            }}
          >
            {t("copy", { defaultValue: "Copy" })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sb-share">
      <div className="sb-share-actions">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className="sb-share-action"
            onClick={action.onClick}
          >
            <span className="sb-share-action-icon material-symbols-outlined">
              {action.icon}
            </span>
            <span className="sb-share-action-text">
              <span className="sb-share-action-title">{action.title}</span>
              <span className="sb-share-action-subtitle">
                {action.subtitle}
              </span>
            </span>
            <span className="sb-share-action-chevron material-symbols-outlined rtl-mirror">
              chevron_right
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
