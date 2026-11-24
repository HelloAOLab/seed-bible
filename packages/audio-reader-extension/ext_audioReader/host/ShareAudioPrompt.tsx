import "./ShareAudioPrompt.css";
import type { ModalManager, SharedAudioShareChoice } from "seed-bible/managers";
import { Button } from "seed-bible/components";

/**
 * Asks a host, the first time they press play in a shared session, whether
 * the chapter plays for everyone or only on their own device. `onChoose`
 * runs inside the click, so the audio it starts still counts as the host's
 * own tap. Closing the modal any other way plays nothing.
 */
export function openShareAudioPrompt(
  modals: ModalManager,
  sessionId: string,
  passage: string,
  onChoose: (choice: SharedAudioShareChoice) => void
): void {
  const modalId = `ext_audioReader-share-audio-${sessionId}`;
  const choose = (choice: SharedAudioShareChoice) => {
    modals.closeModal(modalId);
    onChoose(choice);
  };
  modals.openModal({
    id: modalId,
    title: {
      key: "share-audio-title",
      defaultValue: "Play for everyone?",
      ns: "ext_audioReader",
    },
    content: ({ t }) => (
      <div className="ext-audio-reader-share">
        <p className="ext-audio-reader-share-message">
          {t("share-audio-message", {
            defaultValue:
              "Everyone in this session will be asked whether they'd like to hear {{passage}} on their own device. The player opens paused, so you can wait for people to join before pressing play.",
            passage,
            ns: "ext_audioReader",
          })}
        </p>
        <div className="ext-audio-reader-share-actions">
          <Button onClick={() => choose("this-device")}>
            {t("share-audio-this-device", {
              defaultValue: "Only on my device",
              ns: "ext_audioReader",
            })}
          </Button>
          <Button
            variant="primary"
            icon="groups"
            onClick={() => choose("everyone")}
          >
            {t("share-audio-everyone", {
              defaultValue: "Play for everyone",
              ns: "ext_audioReader",
            })}
          </Button>
        </div>
      </div>
    ),
  });
}
