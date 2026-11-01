import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { MaterialIcon } from "../icons";
import { ShareModal } from "../ShareModal/shareModal";
import {
  isSessionHost,
  type BibleReadingSession,
  getConnectedUserVisualKey,
  getUserAnimalVisual,
  getSessionUrl,
} from "../../managers/SessionsManager";
import { useI18n } from "../../i18n/I18nManager";
import { handleHorizontalListKeyNav } from "../../app/keyboardNav";
import {
  getUserDisplayName,
  getUserSessionRole,
  sortUsersBySessionRole,
} from "../Avatar/Avatar";
import { SessionQRCode } from "../SessionQRCode/SessionQRCode";
import {
  ParticipantFriendButton,
  rowsWithFriendButton,
} from "../FriendsPane/ParticipantFriendButton";

const HIGHLIGHT_DURATION_OPTIONS: { label: string; value: number | null }[] = [
  { label: "∞", value: null },
  { label: "8s", value: 8 },
  { label: "16s", value: 16 },
  { label: "20s", value: 20 },
];

/**
 * True when the local client is the host or a co-host of the given session.
 */
export function isLocalSessionHost(
  state: SeedBibleState,
  session: BibleReadingSession
): boolean {
  const options = session.options.value;
  return (
    isSessionHost(options, state.login.userId.value) ||
    isSessionHost(
      options,
      getConnectedUserVisualKey({
        userId: state.login.userId.value,
        connectionId: state.os.connectionId,
      })
    )
  );
}

/**
 * Closes a session's modal once no tab holds the session any more (the tab
 * was closed or the session ended), since that is when the session is torn
 * down. The roster can't signal this: disposing a session leaves its last
 * roster in place, and a reconnect empties it briefly while the session
 * carries on.
 */
export function useCloseWhenSessionEnds(
  state: SeedBibleState,
  session: BibleReadingSession,
  onClose: () => void
) {
  const isSessionOpen = state.tabs.tabs.value.some(
    (tab) => tab.sharedSession === session
  );
  useEffect(() => {
    if (!isSessionOpen) onClose();
  }, [isSessionOpen]);
}

/**
 * Modal content: host-side controls for a shared session. Ported from
 * develop's "Scripture Navigation" panel.
 *
 * - "Only Host can navigate" toggles `allowedNavigators` between `null`
 *   (everyone) and `[hostUserId]` (host only).
 * - "Only Host can highlight" toggles `allowedDecorators` the same way.
 * - Highlight duration picker writes `highlightDurationSeconds`.
 * - "End Session" removes the tab (which disposes the session and removes
 *   its registry entry automatically via `wrapSessionLifecycle`).
 *
 * Non-host participants see the current settings and who's there, but can't
 * change them. Everyone can add the other participants as friends.
 */
function SessionSettingsModalContent(props: {
  state: SeedBibleState;
  session: BibleReadingSession;
  onEndSession: () => void;
  onClose: () => void;
}) {
  const { state, session, onEndSession, onClose } = props;
  const { t } = useI18n();
  useCloseWhenSessionEnds(state, session, onClose);
  const options = session.options.value;
  const hostId = options.hostUserId;
  const isHost = isLocalSessionHost(state, session);

  const onlyHostNavigate =
    Array.isArray(options.allowedNavigators) &&
    options.allowedNavigators.length > 0;
  const onlyHostHighlight =
    Array.isArray(options.allowedDecorators) &&
    options.allowedDecorators.length > 0;
  const shareTranslation = options.shareTranslation;
  const sessionUrl = getSessionUrl(session);

  const urlCopied = useSignal(false);
  const copySessionUrl = () => {
    try {
      navigator.clipboard.writeText(sessionUrl.href);
      urlCopied.value = true;
      setTimeout(() => {
        urlCopied.value = false;
      }, 1200);
    } catch (error) {
      console.error("Failed to copy session URL.", error);
    }
  };

  const setNavigatorsOnlyHost = (onlyHost: boolean) => {
    if (!isHost || !hostId) return;
    session.updateOptions({
      allowedNavigators: onlyHost ? [hostId] : null,
    });
  };

  const setDecoratorsOnlyHost = (onlyHost: boolean) => {
    if (!isHost || !hostId) return;
    session.updateOptions({
      allowedDecorators: onlyHost ? [hostId] : null,
    });
  };

  const setHighlightDuration = (seconds: number | null) => {
    if (!isHost) return;
    session.updateOptions({ highlightDurationSeconds: seconds });
  };

  const setShareTranslation = (share: boolean) => {
    if (!isHost) return;
    session.updateOptions({ shareTranslation: share });
  };

  const setCoHost = (coHostKey: string, makeCoHost: boolean) => {
    if (!isHost) return;
    const existing = options.coHostUserIds ?? [];
    const next = makeCoHost
      ? existing.includes(coHostKey)
        ? existing
        : [...existing, coHostKey]
      : existing.filter((id) => id !== coHostKey);
    session.updateOptions({ coHostUserIds: next });
  };

  // The host is listed like any other user, with a "Host" badge, but can't be
  // promoted, so their row shows no co-host action.
  const participants = sortUsersBySessionRole(
    options,
    session.connectedUsers.value
  );
  const friendButtonRows = rowsWithFriendButton(participants);

  return (
    <div className="sb-session-settings">
      <div className="sb-session-settings-scroll">
        <div className="sb-session-settings-url">
          <span className="sb-session-settings-label">
            {t("session-url", { defaultValue: "Session URL" })}
          </span>
          <div className="sb-session-settings-url-row">
            <span
              className="sb-session-settings-url-value"
              title={sessionUrl.href}
            >
              {sessionUrl.href}
            </span>
            <button
              type="button"
              className="sb-session-settings-copy-url"
              onClick={copySessionUrl}
              aria-label={t("copy", { defaultValue: "Copy" })}
              title={
                urlCopied.value
                  ? t("copied", { defaultValue: "Copied" })
                  : t("copy", { defaultValue: "Copy" })
              }
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {urlCopied.value ? "check" : "content_copy"}
              </span>
            </button>
          </div>
        </div>

        <SessionQRCode url={sessionUrl.href} modals={state.modals} />

        {!isHost && (
          <p className="sb-session-settings-note">
            {t("session-settings-host-only_note", {
              defaultValue: "Only the session host can change these settings.",
            })}
          </p>
        )}

        <div className="sb-session-settings-section">
          <div className="sb-session-settings-section-title">
            {t("session-settings-section-navigation", {
              defaultValue: "Navigation",
            })}
          </div>

          <div className="sb-session-settings-row">
            <label
              className="sb-session-settings-label"
              htmlFor="sb-session-only-host-navigate"
            >
              {t("session-settings-host-only_navigate", {
                defaultValue: "Only host can navigate",
              })}
            </label>
            <input
              id="sb-session-only-host-navigate"
              type="checkbox"
              checked={onlyHostNavigate}
              disabled={!isHost}
              onChange={(event: Event) => {
                setNavigatorsOnlyHost(
                  (event.currentTarget as HTMLInputElement).checked
                );
              }}
            />
          </div>
          <p className="sb-session-settings-description">
            {onlyHostNavigate
              ? t("session-settings-navigate-desc_host", {
                  defaultValue:
                    "Only the host can change the passage for everyone.",
                })
              : t("session-settings-navigate-desc_all", {
                  defaultValue:
                    "Everyone in the session can change the passage.",
                })}
          </p>

          <div className="sb-session-settings-row">
            <label
              className="sb-session-settings-label"
              htmlFor="sb-session-only-host-highlight"
            >
              {t("session-settings-host-only_highlight", {
                defaultValue: "Only host can highlight",
              })}
            </label>
            <input
              id="sb-session-only-host-highlight"
              type="checkbox"
              checked={onlyHostHighlight}
              disabled={!isHost}
              onChange={(event: Event) => {
                setDecoratorsOnlyHost(
                  (event.currentTarget as HTMLInputElement).checked
                );
              }}
            />
          </div>
          <p className="sb-session-settings-description">
            {onlyHostHighlight
              ? t("session-settings-highlight-desc_host", {
                  defaultValue: "Only the host can highlight for everyone.",
                })
              : t("session-settings-highlight-desc_all", {
                  defaultValue: "Everyone in the session can highlight.",
                })}
          </p>

          <div className="sb-session-settings-duration">
            <div className="sb-session-settings-duration-title">
              {t("session-settings-highlight-duration", {
                defaultValue: "Highlight for",
              })}
            </div>
            <div
              className="sb-session-settings-duration-options"
              role="radiogroup"
              onKeyDown={(event) => {
                handleHorizontalListKeyNav(event, event.currentTarget);
              }}
            >
              {HIGHLIGHT_DURATION_OPTIONS.map((option) => {
                const selected =
                  options.highlightDurationSeconds === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={`sb-session-settings-duration-option${selected ? " sb-session-settings-duration-option-selected" : ""}`}
                    disabled={!isHost}
                    onClick={() => setHighlightDuration(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sb-session-settings-section">
            <div className="sb-session-settings-label">
              {t("session-settings-verse-effects", {
                defaultValue: "Verse selection effects",
              })}
            </div>

            <div
              className="sb-session-settings-duration-options"
              role="group"
              aria-label={t("session-settings-verse-effects", {
                defaultValue: "Verse selection effects",
              })}
            >
              {(
                [
                  { value: "hosts-only" },
                  { value: "everyone" },
                  { value: "none" },
                ] as const
              ).map((option) => {
                const selected =
                  options.verseSelectionEffectVisibility === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`sb-session-settings-duration-option${
                      selected
                        ? " sb-session-settings-duration-option-selected"
                        : ""
                    }`}
                    aria-pressed={selected}
                    onClick={() => {
                      session.updateOptions({
                        verseSelectionEffectVisibility: option.value,
                      });
                    }}
                  >
                    {t(
                      {
                        "hosts-only":
                          "session-settings-verse-effects-hosts-only",
                        everyone: "session-settings-verse-effects-everyone",
                        none: "session-settings-verse-effects-none",
                      }[option.value]
                    )}
                  </button>
                );
              })}
            </div>

            <p className="sb-session-settings-description">
              {options.verseSelectionEffectVisibility === "hosts-only"
                ? t("session-settings-verse-effects-desc-hosts", {
                    defaultValue: "Show effects when a host selects a verse.",
                  })
                : options.verseSelectionEffectVisibility === "everyone"
                  ? t("session-settings-verse-effects-desc-everyone", {
                      defaultValue: "Show effects when anyone selects a verse.",
                    })
                  : t("session-settings-verse-effects-desc-none", {
                      defaultValue:
                        "Verse selection effects are turned off for everyone.",
                    })}
            </p>
          </div>
        </div>

        <div className="sb-session-settings-section">
          <div className="sb-session-settings-section-title">
            {t("session-settings-section-sharing", { defaultValue: "Sharing" })}
          </div>

          <div className="sb-session-settings-row">
            <label
              className="sb-session-settings-label"
              htmlFor="sb-session-share-translation"
            >
              {t("session-settings-share-translation", {
                defaultValue: "Share translation",
              })}
            </label>
            <input
              id="sb-session-share-translation"
              type="checkbox"
              checked={shareTranslation}
              disabled={!isHost}
              onChange={(event: Event) => {
                setShareTranslation(
                  (event.currentTarget as HTMLInputElement).checked
                );
              }}
            />
          </div>
          <p className="sb-session-settings-description">
            {shareTranslation
              ? t("session-settings-share-translation-desc_shared", {
                  defaultValue:
                    "Everyone reads the same translation. Changing it updates it for everyone.",
                })
              : t("session-settings-share-translation-desc_unique", {
                  defaultValue:
                    "Each person keeps their own translation. Changing yours won't affect others.",
                })}
          </p>
        </div>

        {participants.length > 0 && (
          <div className="sb-session-settings-section">
            <div className="sb-session-settings-section-title">
              {t("session-settings-section-participants", {
                defaultValue: "Participants",
              })}
            </div>
            <ul className="sb-session-participants">
              {participants.map((user) => {
                const coHostKey = getConnectedUserVisualKey(user);
                const role = getUserSessionRole(options, user);
                const isHostUser = role === "host";
                const isCoHost = role === "co-host";
                const visual = getUserAnimalVisual(coHostKey);
                const imageUrl = user.profile?.pictureUrl ?? null;
                return (
                  <li
                    key={user.connectionId}
                    className="sb-session-participant"
                  >
                    <span
                      className={`sb-session-participant-avatar${imageUrl ? " sb-session-participant-avatar-has-image" : ""}`}
                      style={
                        imageUrl
                          ? {
                              borderColor: visual.color,
                              backgroundImage: `url(${imageUrl})`,
                            }
                          : { backgroundColor: visual.color }
                      }
                      aria-hidden="true"
                    >
                      {!imageUrl && (
                        <MaterialIcon>{visual.defaultIcon}</MaterialIcon>
                      )}
                    </span>
                    <span
                      className="sb-session-participant-name"
                      title={getUserDisplayName(user)}
                    >
                      {getUserDisplayName(user)}
                      {isHostUser && (
                        <span className="sb-session-participant-badge">
                          {t("host", { defaultValue: "Host" })}
                        </span>
                      )}
                      {isCoHost && (
                        <span className="sb-session-participant-badge">
                          {t("co-host", { defaultValue: "Co-host" })}
                        </span>
                      )}
                    </span>
                    {friendButtonRows.has(user.connectionId) && (
                      <ParticipantFriendButton
                        state={state}
                        userId={user.userId}
                        displayName={getUserDisplayName(user)}
                      />
                    )}
                    {isHost && !isHostUser && (
                      <button
                        type="button"
                        className={`sb-session-participant-action${isCoHost ? " sb-session-participant-action-active" : ""}`}
                        onClick={() => setCoHost(coHostKey, !isCoHost)}
                      >
                        {isCoHost
                          ? t("remove-co-host", {
                              defaultValue: "Remove co-host",
                            })
                          : t("make-co-host", { defaultValue: "Make co-host" })}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="sb-session-settings-actions">
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={() => {
            onEndSession();
            onClose();
          }}
        >
          {t("end-session", { defaultValue: "End Session" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("close", { defaultValue: "Close" })}
        </button>
      </div>
    </div>
  );
}

/**
 * Opens the session settings modal for a shared session. Shared by the tab
 * kebab and the participants sheet and modal so all open the exact same
 * dialog. Ending the session from the modal removes whichever tab is backed by
 * this session.
 */
export function openSessionSettingsModal(
  state: SeedBibleState,
  session: BibleReadingSession
) {
  const modalId = `session-settings-${session.id}`;
  state.modals.openModal({
    id: modalId,
    title: {
      key: "session-settings",
      defaultValue: "Session settings",
    },
    content: () => (
      <SessionSettingsModalContent
        state={state}
        session={session}
        onEndSession={() => {
          const tab = state.tabs.tabs.value.find(
            (t) => t.sharedSession === session
          );
          if (tab) state.tabs.removeTab(tab.id);
        }}
        onClose={() => {
          state.modals.closeModal(modalId);
        }}
      />
    ),
  });
}

export function openShareSessionModal(
  state: SeedBibleState,
  session: BibleReadingSession
) {
  const modalId = `share-session-${session.id}`;
  state.modals.openModal({
    id: modalId,
    title: { key: "share-sheet-title", defaultValue: "Share" },
    content: () => (
      <ShareSessionModalContent
        state={state}
        session={session}
        onClose={() => state.modals.closeModal(modalId)}
      />
    ),
  });
}

function ShareSessionModalContent(props: {
  state: SeedBibleState;
  session: BibleReadingSession;
  onClose: () => void;
}) {
  const { state, session, onClose } = props;
  useCloseWhenSessionEnds(state, session, onClose);
  const shareUrl = getSessionUrl(session);

  return (
    <ShareModal
      app={state.app}
      modals={state.modals}
      session={session}
      hideShareLink
      onClose={onClose}
      onShareVia={() => {
        void navigator.share?.({
          title: document.title,
          url: shareUrl.href,
        });
        onClose();
      }}
    />
  );
}
