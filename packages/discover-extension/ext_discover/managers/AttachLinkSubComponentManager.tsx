import { signal } from "@preact/signals";
import type { AttachLinkSubComponentManager } from "ext_discover.interfaces.managers.AttachLinkSubComponentManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, AttachLinkSubComponentManager>();

export function getAttachLinkSubComponentManager(
  scope: string
): AttachLinkSubComponentManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createAttachLinkSubComponentManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createAttachLinkSubComponentManager(): AttachLinkSubComponentManager {
  const isWarningModalShow = signal(false);

  const setIsWarningModalShow = (value: boolean) => {
    isWarningModalShow.value = value;
  };

  const recordingSwitchCallback = (callback: () => void) => {
    if (G.isRecording) {
      return ShowNotification({
        message: "Cannot Switch while recording!",
        severity: "error",
      });
    }
    if (G.hasRecording) {
      setIsWarningModalShow(true);
      G.AfterConfirmCallBackRecording = callback;
      return;
    }
    callback();
  };

  return {
    isWarningModalShow,
    setIsWarningModalShow,
    recordingSwitchCallback,
  };
}
