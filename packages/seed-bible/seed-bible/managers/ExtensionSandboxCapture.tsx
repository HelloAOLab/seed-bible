import { useEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../i18n";

export type SandboxCaptureKind = "audio" | "photo";

/** An open microphone or camera, for one capture. */
export interface SandboxCaptureSource {
  /** What the camera sees, for the preview; null for the microphone. */
  stream: MediaStream | null;
  /** Starts recording (the microphone only). */
  start: () => void;
  /** Stops and returns the recording, or takes the photo. Then closes. */
  finish: () => Promise<Blob>;
  /** Turns the device off without capturing anything. Safe to call twice. */
  close: () => void;
}

/** How the host reaches the microphone and camera. */
export interface SandboxMediaCapture {
  /** Opens the device; the browser asks the user first if it needs to. */
  open: (kind: SandboxCaptureKind) => Promise<SandboxCaptureSource>;
}

/**
 * The browser's own microphone and camera. Sandboxed frames can't use them
 * (an opaque origin is never a "secure context" for `getUserMedia`), so the
 * host opens them, in the app's origin, and only ever while its own capture
 * dialog is showing.
 */
export const browserMediaCapture: SandboxMediaCapture = {
  async open(kind) {
    const stream = await navigator.mediaDevices.getUserMedia(
      kind === "audio" ? { audio: true } : { video: true }
    );
    const stopTracks = () => {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    };
    if (kind === "audio") {
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      return {
        stream: null,
        start: () => recorder.start(),
        finish: () =>
          new Promise<Blob>((resolve) => {
            recorder.onstop = () => {
              stopTracks();
              resolve(new Blob(chunks, { type: recorder.mimeType }));
            };
            recorder.stop();
          }),
        close: () => {
          recorder.onstop = null;
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
          stopTracks();
        },
      };
    }
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    return {
      stream,
      start: () => {},
      finish: async () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")!.drawImage(video, 0, 0);
        stopTracks();
        return new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (blob) =>
              blob ? resolve(blob) : reject(new Error("No photo was taken.")),
            "image/jpeg",
            0.9
          )
        );
      },
      close: stopTracks,
    };
  },
};

export type SandboxCaptureOutcome =
  | { blob: Blob }
  | { cancelled: true }
  | { error: string };

type Phase = "opening" | "ready" | "recording" | "saving";

/**
 * The host's own dialog for one recording or photo. The device is on only
 * while it's open, nothing is captured until the user presses the button,
 * and the extension gets just the result, never a live stream.
 */
export function SandboxCaptureDialog({
  kind,
  extensionTitle,
  maxSeconds,
  capture,
  onDone,
}: {
  kind: SandboxCaptureKind;
  extensionTitle: string;
  maxSeconds: number;
  capture: SandboxMediaCapture;
  onDone: (outcome: SandboxCaptureOutcome) => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("opening");
  const [seconds, setSeconds] = useState(0);
  const source = useRef<SandboxCaptureSource | null>(null);
  const preview = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let unmounted = false;
    capture.open(kind).then(
      (opened) => {
        if (unmounted) {
          opened.close();
          return;
        }
        source.current = opened;
        setPhase("ready");
      },
      (err: unknown) => {
        if (!unmounted) {
          onDone({ error: String(err) });
        }
      }
    );
    return () => {
      unmounted = true;
      source.current?.close();
    };
  }, []);

  useEffect(() => {
    if (preview.current && source.current?.stream) {
      preview.current.srcObject = source.current.stream;
    }
  }, [phase]);

  const finish = async () => {
    const opened = source.current;
    if (!opened) {
      return;
    }
    setPhase("saving");
    try {
      onDone({ blob: await opened.finish() });
    } catch (err) {
      onDone({ error: String(err) });
    }
  };

  useEffect(() => {
    if (phase !== "recording") {
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= maxSeconds) {
        clearInterval(timer);
        void finish();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {kind === "audio"
          ? t("extension-capture-audio-intro", { name: extensionTitle })
          : t("extension-capture-photo-intro", { name: extensionTitle })}
      </p>
      {kind === "photo" && phase !== "opening" && (
        <video
          ref={preview}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", maxHeight: "50vh", borderRadius: "8px" }}
        />
      )}
      {phase === "opening" && <p>{t("extension-capture-opening")}</p>}
      {phase === "recording" && (
        <p role="status">
          {t("extension-capture-recording", { seconds, max: maxSeconds })}
        </p>
      )}
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-extension-consent-cancel"
          onClick={() => onDone({ cancelled: true })}
        >
          {t("extension-capture-cancel")}
        </button>
        {kind === "audio" && phase === "ready" && (
          <button
            type="button"
            className="sb-extension-consent-allow"
            onClick={() => {
              source.current!.start();
              setPhase("recording");
            }}
          >
            {t("extension-capture-record")}
          </button>
        )}
        {kind === "audio" && phase === "recording" && (
          <button
            type="button"
            className="sb-extension-consent-allow"
            onClick={() => void finish()}
          >
            {t("extension-capture-stop")}
          </button>
        )}
        {kind === "photo" && phase === "ready" && (
          <button
            type="button"
            className="sb-extension-consent-allow"
            onClick={() => void finish()}
          >
            {t("extension-capture-take")}
          </button>
        )}
      </div>
    </div>
  );
}
